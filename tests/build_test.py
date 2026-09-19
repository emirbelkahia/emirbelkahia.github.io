"""Regression checks for the shared source, escaping and read-only freshness check."""
import copy
from datetime import datetime
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_site', ROOT / 'build-site.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'content/cv.json').read_text())
        self.redirects = json.loads((ROOT / 'content/redirects.json').read_text())

    def test_shared_facts_propagate_without_changing_source(self):
        self.data['experience'][0]['title'] = 'Principal Customer Success Manager'
        self.data['experience'][0]['start'] = '2026-07'
        self.data['skills'].append('Shared skill fixture')
        original = copy.deepcopy(self.data)
        outputs = build.render_outputs(self.data)
        self.assertEqual(self.data, original)
        self.assertEqual(outputs, build.render_outputs(self.data))
        for name, text in outputs.items():
            self.assertIn('Principal Customer Success Manager', text, name)
        for name in ('index.html', 'cv.html'):
            graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',
                                        outputs[name], re.S)[1])['@graph']
            person = next(item for item in graph if item['@type'] == 'Person')
            self.assertEqual(person['worksFor'][0]['startDate'], '2026-07')
            self.assertIn('Shared skill fixture', person['knowsAbout'])
        for name in ('cv.html', 'cv-ats.html'):
            self.assertIn('Jul 2026', outputs[name])
            self.assertIn('Shared skill fixture', outputs[name])
        self.assertIn('2026-07 – Present', outputs['cv.md'])
        self.assertIn('Shared skill fixture', outputs['cv.md'])

    def test_content_cannot_break_html_or_jsonld(self):
        text = '</script><script>alert("x")</script> & [link]'
        self.data['profile']['given_name'] = text
        outputs = build.render_outputs(self.data)
        for name in ('index.html', 'cv.html', 'cv-ats.html'):
            self.assertNotIn(text, outputs[name])
            self.assertIn('&lt;/script&gt;', outputs[name])
        for name in ('index.html', 'cv.html'):
            graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',
                                        outputs[name], re.S)[1])['@graph']
            person = next(item for item in graph if item['@type'] == 'Person')
            self.assertEqual(person['givenName'], text)
        self.assertIn(r'\[link\]', outputs['cv.md'])
        self.assertNotIn('<script>', outputs['cv.md'])

    def test_short_links_resolve_existing_links_without_becoming_open_redirects(self):
        outputs = build.redirect_outputs(self.data, self.redirects)
        self.assertEqual(set(outputs), {f'{route}/index.html' for route in self.redirects})
        links = {link['key']: link for link in self.data['links']}
        for route, link_key in self.redirects.items():
            page = outputs[f'{route}/index.html']
            target = links[link_key]['url']
            if target.startswith('/'):
                target = self.data['profile']['url'].rstrip('/') + target
            self.assertIn(build.REDIRECT_MARKER, page)
            self.assertIn('<meta name="robots" content="noindex,follow">', page)
            self.assertIn(f'<link rel="canonical" href="{target}">', page)
            self.assertIn(f'location.replace({json.dumps(target)})', page)
        self.assertEqual(outputs['contact/index.html'], outputs['linkedin/index.html'])
        with self.assertRaisesRegex(ValueError, 'Invalid redirect route'):
            build.redirect_outputs(self.data, {'bad/path': 'github'})
        with self.assertRaisesRegex(ValueError, 'Unknown redirect link key'):
            build.redirect_outputs(self.data, {'elsewhere': 'missing'})

    def test_cli_detects_drift_without_writing_and_ignores_private_env(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for folder in ('content', 'templates'):
                shutil.copytree(ROOT / folder, root / folder)
            (root / 'assets').mkdir()
            for name in ('index.css', 'cv.css'):
                shutil.copy(ROOT / 'assets' / name, root / 'assets' / name)
            shutil.copy(ROOT / 'build-site.py', root)
            (root / '.env').write_text('CV_EMAIL=private-fixture@example.invalid\nCV_PHONE=PRIVATE-PHONE\n')

            def run(*args):
                return subprocess.run([sys.executable, str(root / 'build-site.py'), *args],
                                      capture_output=True, text=True)

            self.assertEqual(run().returncode, 0)
            generated = set(build.render_outputs(self.data))
            generated.update(build.redirect_outputs(self.data, self.redirects))
            generated.add('sitemap.xml')
            paths = [root / name for name in generated]
            for path in paths:
                self.assertNotIn('private-fixture', path.read_text())
                self.assertNotIn('PRIVATE-PHONE', path.read_text())
            before = {path: path.stat().st_mtime_ns for path in paths}
            self.assertEqual(run().returncode, 0)
            self.assertEqual(before, {path: path.stat().st_mtime_ns for path in paths})
            (root / 'cv.md').write_text('manual drift\n')
            (root / 'llms.txt').unlink()
            (root / 'github/index.html').write_text('manual drift\n')
            obsolete = root / 'old-link/index.html'
            obsolete.parent.mkdir()
            obsolete.write_text(build.REDIRECT_MARKER + '\n')
            result = run('--check')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('cv.md', result.stderr)
            self.assertIn('llms.txt', result.stderr)
            self.assertIn('github/index.html', result.stderr)
            self.assertIn('old-link/index.html', result.stderr)
            self.assertEqual((root / 'cv.md').read_text(), 'manual drift\n')
            self.assertFalse((root / 'llms.txt').exists())
            self.assertTrue(obsolete.exists())
            self.assertEqual(run().returncode, 0)
            self.assertFalse(obsolete.exists())
            self.assertEqual(run('--check').returncode, 0)
            self.data['experience'][0]['start'] = '2026-13'
            (root / 'content/cv.json').write_text(json.dumps(self.data))
            before = {path: path.read_bytes() for path in paths}
            self.assertNotEqual(run().returncode, 0)
            self.assertEqual(before, {path: path.read_bytes() for path in paths})

    def test_sitemap_is_generated_and_its_dates_only_move_with_content(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for folder in ('content', 'templates'):
                shutil.copytree(ROOT / folder, root / folder)
            (root / 'assets').mkdir()
            for name in ('index.css', 'cv.css'):
                shutil.copy(ROOT / 'assets' / name, root / 'assets' / name)
            shutil.copy(ROOT / 'build-site.py', root)
            sitemap = root / 'sitemap.xml'
            today = datetime.now().strftime('%Y-%m-%d')

            def run(*args):
                return subprocess.run([sys.executable, str(root / 'build-site.py'), *args],
                                      capture_output=True, text=True)

            def dates():
                return re.findall(r'<lastmod>(\S+)</lastmod>', sitemap.read_text())

            self.assertEqual(run().returncode, 0)
            base = self.data['profile']['url']
            self.assertEqual(re.findall(r'<loc>(\S+)</loc>', sitemap.read_text()),
                             [base, base + 'cv.html'])
            # cv.pdf embeds private contacts and cv-ats.html is noindex.
            for excluded in ('cv.pdf', 'cv-ats.html'):
                self.assertNotIn(excluded, sitemap.read_text())

            # A stale sitemap has to fail the read-only check: that is the guardrail.
            sitemap.write_text('manual drift\n')
            result = run('--check')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('sitemap.xml', result.stderr)
            self.assertEqual(sitemap.read_text(), 'manual drift\n')
            self.assertEqual(run().returncode, 0)

            # Unchanged pages carry their dates forward rather than restamping today,
            # so a pull request that leaves the content alone never rebuilds the sitemap.
            carried = sitemap.read_text().replace(today, '2020-01-02')
            sitemap.write_text(carried)
            self.assertEqual(run('--check').returncode, 0)
            self.assertEqual(sitemap.read_text(), carried)

            # Interests reach cv.html but not the homepage, so only that page's date moves.
            self.data['interests'][0]['text'] = 'Sitemap fixture interest'
            (root / 'content/cv.json').write_text(json.dumps(self.data))
            self.assertEqual(run().returncode, 0)
            self.assertEqual(dates(), ['2020-01-02', today])
            self.assertEqual(run('--check').returncode, 0)


if __name__ == '__main__':
    unittest.main()
