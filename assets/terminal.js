(function() {
  // Secret word trigger
  var secretWord = 'terminal';
  var buffer = '';
  var bufferTimer = null;

  // File system
  var fs = {
    '/': { type: 'dir', children: ['Users'], size: 64, date: 'Jan 10 09:00' },
    '/Users': { type: 'dir', children: ['emirbelkahia'], size: 64, date: 'Jan 10 09:00' },
    '/Users/emirbelkahia': { type: 'dir', children: ['documents', 'desktop', '.spicy'], size: 160, date: 'Feb 14 18:32' },
    '/Users/emirbelkahia/documents': { type: 'dir', children: ['resume.pdf', 'projects.txt'], size: 128, date: 'Feb 12 10:15' },
    '/Users/emirbelkahia/desktop': { type: 'dir', children: ['welcome.txt'], size: 96, date: 'Feb  1 14:00' },
    '/Users/emirbelkahia/.spicy': { type: 'dir', children: ['spicy.mp4'], size: 96, date: 'Dec 25  2024' },
    '/Users/emirbelkahia/documents/resume.pdf': {
      type: 'file', size: 284160, date: 'Feb 12 10:15',
      content: "This is a PDF file. Use 'open resume.pdf' to view it in your browser."
    },
    '/Users/emirbelkahia/documents/projects.txt': {
      type: 'file', size: 312, date: 'Feb  8 22:41',
      content: "# Projects\n\n- Medium (SharpCustomerSuccess) — CS insights & mental models\n  https://medium.com/@emirbelkahia\n\n- n8n Creator — CS automation workflows & templates\n  https://n8n.io/creators/emirbelkahia/\n\n- GitHub — Open-source tools inspired by real CS practice\n  https://github.com/emirbelkahia"
    },
    '/Users/emirbelkahia/desktop/welcome.txt': {
      type: 'file', size: 164, date: 'Feb  1 14:00',
      content: "Welcome to my corner of the internet.\n\nFeel free to look around.\nTry 'ls' to see what's here, or 'help' for all commands.\n\nHint: not everything is in plain sight..."
    },
    '/Users/emirbelkahia/.spicy/spicy.mp4': {
      type: 'file', size: 69420, date: 'Dec 25  2024',
      content: "Binary file. Use 'open spicy.mp4' to play."
    }
  };

  var cwd = '/Users/emirbelkahia';
  var history = [];
  var historyIdx = -1;
  var termOpen = false;

  var overlay = document.getElementById('terminal-overlay');
  var output = document.getElementById('term-output');
  var input = document.getElementById('term-input');
  var prompt = document.getElementById('term-prompt');
  var titleEl = document.getElementById('term-title');
  var body = document.getElementById('term-body');

  function getPrompt() {
    var display = cwd.replace('/Users/emirbelkahia', '~') || '~';
    return display + ' $ ';
  }

  function updatePrompt() {
    prompt.textContent = getPrompt();
    var display = cwd.replace('/Users/emirbelkahia', '~') || '~';
    titleEl.textContent = display + ' — zsh';
  }

  function addLine(text, cls) {
    var div = document.createElement('div');
    div.className = 'term-line' + (cls ? ' ' + cls : '');
    div.innerHTML = text;
    output.appendChild(div);
  }

  function addPromptLine(cmd) {
    addLine('<span style="color:#28c840">' + escHtml(getPrompt()) + '</span>' + escHtml(cmd));
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function resolvePath(p) {
    if (p === '/') return '/';
    p = p.replace(/\/+$/, '');
    var base;
    if (p.startsWith('/')) {
      base = [''];
      p = p.slice(1);
    } else if (p.startsWith('~')) {
      base = ['', 'Users', 'emirbelkahia'];
      p = p.slice(1);
      if (p.startsWith('/')) p = p.slice(1);
    } else {
      base = cwd === '/' ? [''] : cwd.split('/');
    }
    var parts = p.split('/').filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '.') continue;
      if (parts[i] === '..') { if (base.length > 1) base.pop(); }
      else base.push(parts[i]);
    }
    var resolved = base.join('/') || '/';
    return resolved;
  }

  function scrollBottom() {
    body.scrollTop = body.scrollHeight;
  }

  // Commands
  var commands = {
    help: function() {
      addLine('Available commands:', 'accent');
      addLine('  <span style="display:inline-block;width:140px">ls [path]</span>List directory contents');
      addLine('  <span style="display:inline-block;width:140px">cd &lt;path&gt;</span>Change directory');
      addLine('  <span style="display:inline-block;width:140px">pwd</span>Print working directory');
      addLine('  <span style="display:inline-block;width:140px">cat &lt;file&gt;</span>Display file contents');
      addLine('  <span style="display:inline-block;width:140px">open &lt;file&gt;</span>Open a file');
      addLine('  <span style="display:inline-block;width:140px">whoami</span>Current user');
      addLine('  <span style="display:inline-block;width:140px">clear</span>Clear the terminal');
      addLine('  <span style="display:inline-block;width:140px">help</span>Show this help');
      addLine('');
      addLine('  <span style="display:inline-block;width:140px">Tab</span>Autocomplete file/folder names', 'dim');
      addLine('  <span style="display:inline-block;width:140px">Up/Down</span>Navigate command history', 'dim');
      addLine('  <span style="display:inline-block;width:140px">Esc</span>Exit terminal', 'dim');
    },
    ls: function(args) {
      var showAll = false, longFmt = false, pathArg = null;
      for (var a = 0; a < args.length; a++) {
        if (args[a].charAt(0) === '-') {
          if (args[a].indexOf('a') >= 0) showAll = true;
          if (args[a].indexOf('l') >= 0) longFmt = true;
        } else { pathArg = args[a]; }
      }
      var target = pathArg ? resolvePath(pathArg) : cwd;
      var node = fs[target];
      if (!node) { addLine('ls: ' + escHtml(pathArg || '') + ': No such file or directory'); return; }
      if (node.type === 'file') { addLine(target.split('/').pop()); return; }
      var children = node.children || [];
      if (showAll) {
        children = ['.', '..'].concat(children);
      } else {
        children = children.filter(function(c) { return c.charAt(0) !== '.'; });
      }
      if (longFmt) {
        addLine('total ' + children.length);
        for (var i = 0; i < children.length; i++) {
          var child = children[i];
          var childPath = (target === '/' ? '' : target) + '/' + child;
          var cn = fs[childPath];
          var isDir = cn && cn.type === 'dir';
          var perm = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
          var links = isDir ? ' 3' : ' 1';
          var sz = cn ? String(cn.size) : (child === '.' || child === '..' ? '160' : '0');
          while (sz.length < 7) sz = ' ' + sz;
          var dt = cn ? cn.date : 'Feb 14 18:32';
          var name = isDir ? '<span class="dir">' + escHtml(child) + '</span>' : escHtml(child);
          addLine(perm + links + ' emirbelkahia  staff ' + sz + ' ' + dt + ' ' + name);
        }
      } else {
        for (var j = 0; j < children.length; j++) {
          var ch = children[j];
          var chPath = (target === '/' ? '' : target) + '/' + ch;
          var chNode = fs[chPath];
          if (chNode && chNode.type === 'dir') {
            addLine(escHtml(ch) + '/', 'dir');
          } else {
            addLine(escHtml(ch));
          }
        }
      }
    },
    cd: function(args) {
      if (!args[0] || args[0] === '~') { cwd = '/Users/emirbelkahia'; updatePrompt(); return; }
      var target = resolvePath(args[0]);
      var node = fs[target];
      if (!node) { addLine('cd: no such file or directory: ' + escHtml(args[0])); return; }
      if (node.type !== 'dir') { addLine('cd: not a directory: ' + escHtml(args[0])); return; }
      cwd = target;
      updatePrompt();
    },
    pwd: function() {
      addLine(escHtml(cwd));
    },
    cat: function(args) {
      if (!args[0]) { addLine('cat: missing file operand'); return; }
      var target = resolvePath(args[0]);
      var node = fs[target];
      if (!node) { addLine('cat: ' + escHtml(args[0]) + ': No such file or directory'); return; }
      if (node.type === 'dir') { addLine('cat: ' + escHtml(args[0]) + ': Is a directory'); return; }
      var lines = node.content.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = escHtml(lines[i]);
        // Make URLs clickable
        line = line.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:#3498db;text-decoration:underline">$1</a>');
        addLine(line);
      }
    },
    open: function(args) {
      if (!args[0]) { addLine('open: missing file operand'); return; }
      var target = resolvePath(args[0]);
      var node = fs[target];
      if (!node) { addLine('open: ' + escHtml(args[0]) + ': No such file or directory'); return; }
      if (target.endsWith('/resume.pdf')) {
        addLine('Opening resume...', 'success');
        window.open('cv.pdf', '_blank');
        if (window.goatcounter && window.goatcounter.count) {
          window.goatcounter.count({ path: 'terminal-open-resume', event: true });
        }
      } else if (target.endsWith('/spicy.mp4')) {
        addLine('');
        addLine('        <span style="color:#ff6b6b">╦═╗╦╔═╗╦╔═  ╦═╗╔═╗╦  ╦  </span>');
        addLine('        <span style="color:#ff6b6b">╠╦╝║║  ╠╩╗  ╠╦╝║ ║║  ║  </span>');
        addLine('        <span style="color:#ff6b6b">╩╚═╩╚═╝╩ ╩  ╩╚═╚═╝╩═╝╩═╝</span>');
        addLine('');
        addLine('  Never gonna give you up, never gonna let you down...', 'accent');
        addLine('  Never gonna run around and desert you!', 'accent');
        addLine('');
        var iframe = document.createElement('div');
        iframe.className = 'term-line';
        iframe.style.textAlign = 'center';
        iframe.innerHTML = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border-radius:8px; margin-top:8px; max-width:100%;"></iframe>';
        output.appendChild(iframe);
        if (window.goatcounter && window.goatcounter.count) {
          window.goatcounter.count({ path: 'terminal-rickroll', event: true });
        }
      } else {
        addLine('open: cannot open ' + escHtml(args[0]));
      }
    },
    whoami: function() {
      addLine('emirbelkahia');
    },
    clear: function() {
      output.innerHTML = '';
    },
    exit: function() {
      closeTerminal();
    }
  };

  function execCommand(raw) {
    var trimmed = raw.trim();
    if (!trimmed) return;
    history.push(trimmed);
    historyIdx = history.length;
    addPromptLine(trimmed);
    var parts = trimmed.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var args = parts.slice(1);
    if (commands[cmd]) {
      commands[cmd](args);
    } else {
      addLine('zsh: command not found: ' + escHtml(cmd));
    }
    scrollBottom();
  }

  // Tab completion
  function tabComplete(val) {
    var parts = val.split(/\s+/);
    if (parts.length < 2) return val;
    var partial = parts[parts.length - 1];
    var dir, prefix;
    var lastSlash = partial.lastIndexOf('/');
    if (lastSlash >= 0) {
      dir = resolvePath(partial.slice(0, lastSlash + 1));
      prefix = partial.slice(lastSlash + 1);
    } else {
      dir = cwd;
      prefix = partial;
    }
    var node = fs[dir];
    if (!node || node.type !== 'dir') return val;
    var matches = node.children.filter(function(c) {
      return c.toLowerCase().startsWith(prefix.toLowerCase());
    });
    if (matches.length === 1) {
      var match = matches[0];
      var childPath = (dir === '/' ? '' : dir) + '/' + match;
      if (fs[childPath] && fs[childPath].type === 'dir') match += '/';
      parts[parts.length - 1] = (lastSlash >= 0 ? partial.slice(0, lastSlash + 1) : '') + match;
      return parts.join(' ');
    }
    if (matches.length > 1) {
      addPromptLine(val);
      for (var i = 0; i < matches.length; i++) {
        var mp = (dir === '/' ? '' : dir) + '/' + matches[i];
        if (fs[mp] && fs[mp].type === 'dir') {
          addLine(escHtml(matches[i]) + '/', 'dir');
        } else {
          addLine(escHtml(matches[i]));
        }
      }
      scrollBottom();
    }
    return val;
  }

  // Banner
  function showBanner() {
    output.innerHTML = '';
    addLine('');
    addLine('  _____ __  __ ___ ____  ', 'success');
    addLine(' | ____|  \\/  |_ _|  _ \\ ', 'success');
    addLine(' |  _| | |\\/| || || |_) |', 'success');
    addLine(' | |___| |  | || ||  _ < ', 'success');
    addLine(' |_____|_|  |_|___|_| \\_\\', 'success');
    addLine('');
    addLine(" Welcome to Emir Belkahia's terminal.", 'accent');
    addLine(" Type 'help' to get started. Press Esc to exit.", 'dim');
    addLine('');
  }

  // Open / close terminal
  function openTerminal() {
    if (termOpen) return;
    termOpen = true;
    showBanner();
    updatePrompt();
    overlay.classList.add('active');
    requestAnimationFrame(function() {
      overlay.classList.add('visible');
    });
    setTimeout(function() { input.focus(); }, 100);
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: 'terminal-easter-egg', event: true });
    }
  }

  function closeTerminal() {
    if (!termOpen) return;
    termOpen = false;
    overlay.classList.remove('visible');
    setTimeout(function() {
      overlay.classList.remove('active');
    }, 300);
    buffer = '';
  }

  // Secret word detection
  document.addEventListener('keydown', function(e) {
    if (termOpen) {
      if (e.key === 'Escape') { closeTerminal(); e.preventDefault(); return; }
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      buffer += e.key.toLowerCase();
      clearTimeout(bufferTimer);
      bufferTimer = setTimeout(function() { buffer = ''; }, 2000);
      if (buffer.includes(secretWord)) {
        buffer = '';
        openTerminal();
      }
    }
  });

  // Terminal input handling
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      execCommand(input.value);
      input.value = '';
      e.preventDefault();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      input.value = tabComplete(input.value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIdx > 0) { historyIdx--; input.value = history[historyIdx]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx < history.length - 1) { historyIdx++; input.value = history[historyIdx]; }
      else { historyIdx = history.length; input.value = ''; }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      commands.clear();
    }
  });

  // Click anywhere in terminal body focuses input
  body.addEventListener('click', function() { input.focus(); });

  // Close button
  document.getElementById('term-close').addEventListener('click', closeTerminal);
})();
