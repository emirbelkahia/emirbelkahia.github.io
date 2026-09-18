#!/usr/bin/env python3
"""Build the public CV formats from content/cv.json (Python standard library only)."""

import argparse
from datetime import datetime
from html import escape
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parent
MONTHS = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')


def variant(value, view):
    """Plain strings are shared; explicit web/ats variants preserve editorial differences."""
    return value[view] if isinstance(value, dict) else value


def date_label(value):
    if value is None:
        return 'Present'
    date = datetime.strptime(value, '%Y-%m')
    return f'{MONTHS[date.month - 1]} {date.year}'


def validate(data):
    if not data['experience'] or data['experience'][0]['end'] is not None:
        raise ValueError('experience must start with the current role (end: null)')
    for role in data['experience']:
        data['companies'][role['company']]
        date_label(role['start'])
        date_label(role['end'])
        if role['end'] and role['end'] < role['start']:
            raise ValueError(f'End date precedes start date: {role["title"]}')
    urls = [data['profile']['url'], data['education']['url']]
    urls += [link['url'] for link in data['links']]
    urls += [company['url'] for company in data['companies'].values() if 'url' in company]
    for url in urls:
        if not (urlsplit(url).scheme == 'https' or url.startswith('/') and not url.startswith('//')):
            raise ValueError(f'Expected an HTTPS or site-relative URL: {url}')


def identity(data):
    profile = data['profile']
    name = f'{profile["given_name"]} {profile["family_name"]}'
    title = data['experience'][0]['title']
    return name, title


def jsonld(data, view):
    profile = data['profile']
    base = profile['url']
    name, title = identity(data)
    person_id = base + '#person'
    site_id = base + '#website'
    page_url = urljoin(base, 'cv.html') if view == 'web' else base
    person = {
        '@type': 'Person', '@id': person_id, 'name': name,
        'givenName': profile['given_name'], 'familyName': profile['family_name'],
        'url': base, 'image': urljoin(base, profile['image']), 'jobTitle': title,
        'description': f'{title} {profile["description"]}',
        'sameAs': [link['url'] for link in data['links'] if link['url'].startswith('https://')],
        'knowsLanguage': [{'@type': 'Language', 'name': item['name']} for item in data['languages']],
        'knowsAbout': list(dict.fromkeys(data['skills'] + data['topics'])),
        'alumniOf': {'@type': 'CollegeOrUniversity', 'name': data['education']['school'],
                     'url': data['education']['url']},
        'worksFor': [],
    }
    roles = data['experience'] if view == 'web' else data['experience'][:1]
    for role in roles:
        person['worksFor'].append({
            '@type': 'EmployeeRole', 'roleName': role['title'], 'startDate': role['start'],
            **({'endDate': role['end']} if role['end'] else {}),
            'worksFor': {'@type': 'Organization', **data['companies'][role['company']]},
        })
    if view == 'web':
        person['hasCredential'] = [{
            '@type': 'EducationalOccupationalCredential', 'name': variant(item['name'], 'web'),
            'credentialCategory': 'certificate', 'dateCreated': item['year'],
            'recognizedBy': {'@type': 'Organization', 'name': item['issuer']},
        } for item in data['certifications']]
    graph = [
        {'@type': 'WebSite', '@id': site_id, 'url': base, 'name': name,
         'description': f'Personal site of {name}: {title}, AI builder, and writer.',
         'inLanguage': 'en', 'publisher': {'@id': person_id}},
        {'@type': 'ProfilePage', '@id': page_url + '#webpage', 'url': page_url,
         'name': name + (' - CV' if view == 'web' else ''), 'inLanguage': 'en',
         'isPartOf': {'@id': site_id}, 'about': {'@id': person_id},
         'mainEntity': {'@id': person_id}},
        person,
    ]
    # JSON is embedded in HTML: a content value must never terminate its script tag.
    return json.dumps({'@context': 'https://schema.org', '@graph': graph},
                      ensure_ascii=False, indent=2).replace('<', '\\u003c')


def items(values, tag='li'):
    return '\n'.join(f'<{tag}>{escape(value)}</{tag}>' for value in values if value is not None)


def experience_html(data, view):
    sections = []
    for role in data['experience']:
        title = escape(role['title'])
        company = escape(data['companies'][role['company']]['name'])
        location = escape(role['location'])
        start, end = date_label(role['start']), date_label(role['end'])
        bullets = items(variant(item, view) for item in role['bullets'])
        if view == 'web':
            header = (f'<h3>{title}</h3>\n<p class="company-date">{company} – {start} to {end}</p>'
                      f'\n<p class="location">{location}</p>')
        else:
            header = (f'<div class="job-header"><div class="job-title">{title}</div>'
                      f'<div class="job-date">{start} – {end}</div></div>\n'
                      f'<div class="company-location"><strong>{company}</strong> | {location}</div>')
        sections.append(f'<div class="job">\n{header}\n<ul>{bullets}</ul>\n</div>')
    return '\n'.join(sections)


def education_item(title, year):
    return ('<div class="education-item"><div class="education-header">'
            f'<div class="education-title">{escape(title)}</div>'
            f'<div class="education-year">{escape(year)}</div></div></div>')


def html_context(data, view):
    profile = data['profile']
    name, title = identity(data)
    links = {link['key']: link for link in data['links']}
    short_title = title.replace('Customer Success Manager', 'CSM')
    raw = {
        'name': name, 'job_title': title, 'site_url': profile['url'], 'image': profile['image'],
        'cv_url': urljoin(profile['url'], 'cv.html'),
        'markdown_url': urljoin(profile['url'], 'cv.md'),
        'llms_url': urljoin(profile['url'], 'llms.txt'),
        'tagline': profile['tagline'], 'focus': profile['focus'],
        # summary is the visible first-person text; description is the third-person
        # sentence for meta descriptions and JSON-LD, where a snippet reads as a bio.
        'description': f'{title} {profile["description"]}',
        'summary': f'{short_title} {profile["summary"]}',
        'linkedin_label': urlsplit(links['linkedin']['url']).netloc.removeprefix('www.')
                          + urlsplit(links['linkedin']['url']).path.rstrip('/'),
    }
    raw.update({key + '_url': urljoin(profile['url'], link['url']) for key, link in links.items()})
    if view == 'home':
        raw['description'] = f'{name} - {title}, AI builder, and writer. {profile["tagline"]}.'
    context = {key: escape(value) for key, value in raw.items()}
    context['jsonld'] = jsonld(data, view)
    context['home_links'] = '\n'.join(
        f'<a href="{escape(link["url"])}" target="_blank" '
        f'rel="{"me noopener" if link["url"].startswith("https://") else "noopener"}" '
        f'data-goatcounter-click="{escape(link["key"])}">\n{escape(link["title"])}'
        f'\n<span class="desc">{escape(link["description"])}</span>\n</a>'
        for link in data['links'])
    if view == 'home':
        return context
    context['highlights'] = items(profile['highlights'])
    context['skills'] = items(data['skills'], 'li' if view == 'web' else 'span')
    context['experience'] = experience_html(data, view)
    projects = []
    for project in data['projects']:
        title = escape(variant(project['name'], view))
        description = escape(variant(project['description'], view))
        projects.append(f'<div><strong>{title}</strong> — {description}</div>' if view == 'web' else
                        f'<div class="project"><div class="project-title">{title}</div>'
                        f'<div class="project-desc">{description}</div></div>')
    context['projects'] = '\n'.join(projects)
    context['project_footer'] = escape(variant(data['project_footer'], view))
    school = data['education']
    school_title = f'{school["school"]} – {school["degree"]}'
    if view == 'web':
        context['education'] = items([f'{school_title} (Class of {school["year"]})'])
        certificates = []
        for certificate in data['certifications']:
            short = variant(certificate['name'], 'web')
            label = (f'{short} – {certificate["issuer"]}' if isinstance(certificate['name'], dict)
                     else f'{certificate["issuer"]} – {short}')
            certificates.append(f'{label} ({certificate["year"]})')
        context['certifications'] = items(certificates)
        context['languages'] = items(f'{x["name"]} ({x["level"]})' for x in data['languages'])
    else:
        context['education'] = education_item(school_title, school['year'])
        context['certifications'] = '\n'.join(education_item(
            f'{x["issuer"]} – {variant(x["name"], view)}', x['year']) for x in data['certifications'])
        context['languages'] = ' | '.join(f'<strong>{escape(x["name"])}</strong> ({escape(x["level"])})'
                                          for x in data['languages'])
    interests = sorted(data['interests'], key=lambda x: x['web_order']) if view == 'web' else data['interests']
    context['interests'] = '\n'.join(f'<li><strong>{escape(variant(x["label"], view))}:</strong> '
                                     f'{escape(variant(x["text"], view))}</li>' for x in interests)
    return context


def md(value):
    """Keep content as text rather than interpreting it as Markdown markup."""
    return re.sub(r'([\\`*_{}\[\]<>#|])', r'\\\1', ' '.join(value.split()))


def md_link(title, url):
    return f'[{md(title)}]({url.replace("(", "%28").replace(")", "%29")})'


def markdown(data):
    name, title = identity(data)
    profile = data['profile']
    links = {x['key']: x for x in data['links']}
    lines = [f'# {md(name)}', '', md(title), '', md(profile['focus']), '',
             f'Public contact: {md_link("LinkedIn", links["linkedin"]["url"])}.', '',
             '## Summary', '', md(f'{title} {profile["summary"]}'), '']
    lines += ['- ' + md(text) for text in profile['highlights']]
    lines += ['', '## Key Skills', ''] + ['- ' + md(text) for text in data['skills']]
    lines += ['', '## Professional Experience', '']
    for role in data['experience']:
        lines += [f'### {md(role["title"])}', '',
                  md(f'{data["companies"][role["company"]]["name"]} · {role["location"]}'),
                  f'{role["start"]} – {role["end"] or "Present"}', '']
        lines += ['- ' + md(variant(text, 'ats')) for text in role['bullets'] if variant(text, 'ats')]
        lines += ['']
    lines += ['## Selected Projects', '']
    for project in data['projects']:
        lines += ['### ' + md(variant(project['name'], 'ats')), '', md(variant(project['description'], 'ats')), '']
    lines += [md(variant(data['project_footer'], 'ats')), '',
              f'{md_link("GitHub", links["github"]["url"])} · {md_link("Writing", links["medium"]["url"])}', '',
              '## Education & Certifications', '']
    school = data['education']
    lines += ['- ' + md(f'{school["school"]} – {school["degree"]} ({school["year"]})')]
    lines += ['- ' + md(f'{x["issuer"]} – {variant(x["name"], "ats")} ({x["year"]})') for x in data['certifications']]
    lines += ['', '## Languages', ''] + ['- ' + md(f'{x["name"]} ({x["level"]})') for x in data['languages']]
    lines += ['', '## Personal Interests', ''] + ['- ' + md(f'{variant(x["label"], "ats")}: {variant(x["text"], "ats")}') for x in data['interests']]
    return '\n'.join(lines) + '\n'


def llms(data):
    name, title = identity(data)
    lines = [f'# {md(name)}', '', f'> {md(title)}. {md(data["profile"]["tagline"])}.', '',
             '## CV', '',
             '- ' + md_link('CV in Markdown', urljoin(data['profile']['url'], 'cv.md'))
             + ': Full public experience, skills, projects and education.',
             '- ' + md_link('CV for browsers', urljoin(data['profile']['url'], 'cv.html'))
             + ': Styled web version with concise descriptions.', '', '## Profiles and writing', '']
    lines += ['- ' + md_link(x['title'], x['url']) + ': ' + md(x['description']) + '.'
              for x in data['links'] if x['key'] != 'cv']
    return '\n'.join(lines) + '\n'


def sitemap(data, changed):
    """Rebuild sitemap.xml, bumping lastmod only for pages whose rendered text changed.

    A `git log` date cannot drive lastmod here. It shifts the moment the build is
    committed, so --check would fail on every pull request, and a depth-1 CI
    checkout reports the same date for every file anyway. Each date is instead
    carried forward from the committed sitemap and bumped only on a real change,
    which also keeps the value honest about content freshness.
    """
    base = data['profile']['url']
    path = ROOT / 'sitemap.xml'
    previous = dict(re.findall(r'<loc>(\S+)</loc>\s*<lastmod>(\S+)</lastmod>',
                               path.read_text(encoding='utf-8'))) if path.exists() else {}
    today = datetime.now().strftime('%Y-%m-%d')
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    # cv.pdf embeds private contacts and cv-ats.html is noindex: neither belongs here.
    for name in ('index.html', 'cv.html'):
        loc = base if name == 'index.html' else urljoin(base, name)
        lastmod = today if name in changed else previous.get(loc, today)
        lines += ['  <url>', f'    <loc>{escape(loc)}</loc>',
                  f'    <lastmod>{lastmod}</lastmod>', '  </url>']
    # changefreq and priority are deliberately absent: Google ignores both.
    return '\n'.join(lines + ['</urlset>', ''])


def render_outputs(data, templates=None):
    validate(data)
    templates = templates or ROOT / 'templates'
    outputs = {}
    for name, view in [('index.html', 'home'), ('cv.html', 'web'), ('cv-ats.html', 'ats')]:
        context = html_context(data, view)
        template = (templates / name).read_text(encoding='utf-8')
        outputs[name] = re.sub(r'{{\s*(\w+)\s*}}', lambda match: context[match[1]], template)
    outputs['cv.md'] = markdown(data)
    outputs['llms.txt'] = llms(data)
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--check', action='store_true', help='Fail on stale or missing generated text; write nothing')
    modes.add_argument('--pdf', action='store_true', help='Also build the private-contact PDF with generate-pdf.sh')
    args = parser.parse_args()
    data = json.loads((ROOT / 'content/cv.json').read_text(encoding='utf-8'))
    outputs = render_outputs(data)

    def matches(name, text):
        path = ROOT / name
        return path.exists() and path.read_text(encoding='utf-8') == text

    # The sitemap's lastmod depends on which pages changed, so it is built after them.
    outputs['sitemap.xml'] = sitemap(data, [n for n, t in outputs.items() if not matches(n, t)])
    stale = [name for name, text in outputs.items() if not matches(name, text)]
    if not args.check:
        for name in stale:
            (ROOT / name).write_text(outputs[name], encoding='utf-8')
    if args.check and stale:
        print('Stale generated files: ' + ', '.join(stale) + '. Run python3 build-site.py.', file=sys.stderr)
        return 1
    print('Generated text is current.' if args.check else 'Built ' + ', '.join(outputs) + '.')
    if args.pdf:
        subprocess.run([str(ROOT / 'generate-pdf.sh')], check=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
