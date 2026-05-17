#!/usr/bin/env node
/**
 * inflate-bundle.js — pad JS bundles to a realistic production-bundle size
 * AND scatter the real config across the middle/bottom of each file.
 *
 * Why: real production webpack bundles are 10-30 MB. A 4 KB main.js looks
 * synthetic, and config at line 1 looks even more synthetic — webpack output
 * scatters everything across module boundaries. This script:
 *
 *   1. Pads each file to a target size (~30 MB total across files).
 *   2. Pushes the real config + secrets OUT of the top of the file so a
 *      casual scroll-from-top doesn't reveal them. Cmd+F still finds them
 *      instantly, but visually they live among 15 MB of webpack modules.
 *
 * IMPORTANT — all padding is ENTIRELY SYNTHETIC:
 *   • No proprietary code from any real company
 *   • No insurance-domain or industry-specific business logic
 *   • Just generic SaaS-app patterns (React-like components, data utilities,
 *     formatters, validators) with neutral names like Widget, Service, etc.
 *
 * Behavior: the padding lives inside named function expressions that are
 * never invoked, so the browser parses but never executes them. The real
 * config blocks execute normally — they're at the top level of the file,
 * just no longer concentrated at line 1.
 *
 * Idempotent: first run backs up originals to public/js/.original/.
 * Subsequent runs re-inflate from the backup. To revert:
 *
 *   node inflate-bundle.js --restore
 */

const fs = require('fs');
const path = require('path');

const TARGETS = {
    'main.js':     3,
    'app.js':      2,
    'env.js':      0.5,
    'firebase.js': 0.5,
};

const JS_DIR     = path.join(__dirname, 'public', 'js');
const BACKUP_DIR = path.join(JS_DIR, '.original');

// ─── Synthetic name pools (no industry-specific terms) ───────────────────────
const NOUNS = [
    'Widget','Service','Handler','Manager','Controller','Provider','Engine',
    'Adapter','Buffer','Channel','Cache','Stream','Pipeline','Renderer',
    'Selector','Reducer','Container','Layout','Toolbar','Sidebar','Panel',
    'Tooltip','Dropdown','Modal','Dialog','Banner','Card','Badge','Avatar',
    'Form','Field','Input','Button','Toggle','Switch','Slider','Picker',
    'Grid','Table','Row','Cell','Column','Header','Footer','List','Item',
    'Tree','Node','Branch','Leaf','Graph','Chart','Series','Axis','Legend',
    'Filter','Sorter','Searcher','Indexer','Parser','Formatter','Validator',
    'Transformer','Mapper','Composer','Splitter','Merger','Cloner','Marshal',
];
const ACTIONS = [
    'process','transform','validate','serialize','deserialize','parse','format',
    'render','dispatch','observe','subscribe','publish','emit','listen','bind',
    'unbind','attach','detach','enable','disable','update','refresh','reload',
    'fetch','load','save','restore','clone','merge','split','filter','sort',
    'map','reduce','flatten','group','pivot','aggregate','normalize',
];
function pick(arr, seed) { return arr[seed % arr.length]; }

// ─── Module-shape generators (varied for realism) ────────────────────────────
const TEMPLATES = [
    (id) => {
        const n = pick(NOUNS, id);
        return `__webpack_modules__[${id}] = function(module, exports, __webpack_require__) {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  var ${n}_${id} = function(props) {
    this.props = props || {};
    this.state = { initialized: false, items: [], count: 0, value: "" };
  };
  ${n}_${id}.prototype.componentDidMount = function() { this.setState({ initialized: true }); };
  ${n}_${id}.prototype.componentDidUpdate = function(p, s) { /* sync */ };
  ${n}_${id}.prototype.componentWillUnmount = function() { /* cleanup */ };
  ${n}_${id}.prototype.shouldComponentUpdate = function(n) { return this.props !== n; };
  ${n}_${id}.prototype.setState = function(patch) { Object.assign(this.state, patch); };
  ${n}_${id}.prototype.render = function() {
    return React.createElement("div", { className: "${n.toLowerCase()}-${id}" },
      React.createElement("span", null, "Label " + this.state.count),
      React.createElement("button", { onClick: this.onClick }, "Action")
    );
  };
  module.exports = ${n}_${id};
};`;
    },
    (id) => {
        const n = pick(NOUNS, id + 1);
        const a = pick(ACTIONS, id);
        return `__webpack_modules__[${id}] = function(module, exports) {
  "use strict";
  function ${a}_${id}(input, options) {
    options = options || {};
    if (!Array.isArray(input)) return [];
    var output = [];
    for (var i = 0, len = input.length; i < len; i++) {
      var item = input[i];
      if (!item || typeof item !== "object") continue;
      output.push({ id: item.id || i, value: item.value, processed: true });
    }
    return output;
  }
  module.exports = { ${a}: ${a}_${id}, ${n}: ${a}_${id} };
};`;
    },
    (id) => {
        const n = pick(NOUNS, id + 2);
        return `__webpack_modules__[${id}] = function(module, exports) {
  "use strict";
  var ${n}Validator_${id} = {
    isRequired: function(v) { return v !== undefined && v !== null && v !== ""; },
    isString:   function(v) { return typeof v === "string"; },
    isNumber:   function(v) { return typeof v === "number" && !isNaN(v); },
    isBoolean:  function(v) { return typeof v === "boolean"; },
    isArray:    function(v) { return Array.isArray(v); },
    minLength:  function(v, n) { return v && v.length >= n; },
    maxLength:  function(v, n) { return v && v.length <= n; },
    pattern:    function(v, re) { return re.test(String(v)); },
    range:      function(v, min, max) { return v >= min && v <= max; },
    oneOf:      function(v, list) { return list.indexOf(v) !== -1; }
  };
  module.exports = ${n}Validator_${id};
};`;
    },
    (id) => {
        const n = pick(NOUNS, id + 3);
        return `__webpack_modules__[${id}] = function(module, exports, __webpack_require__) {
  "use strict";
  var ${n}Reducer_${id} = function(state, action) {
    state = state || { items: [], status: "idle", error: null };
    switch (action.type) {
      case "FETCH_REQUEST_${id}":  return Object.assign({}, state, { status: "loading" });
      case "FETCH_SUCCESS_${id}":  return Object.assign({}, state, { status: "ready", items: action.payload });
      case "FETCH_FAILURE_${id}":  return Object.assign({}, state, { status: "error", error: action.error });
      case "ADD_ITEM_${id}":       return Object.assign({}, state, { items: state.items.concat(action.payload) });
      case "REMOVE_ITEM_${id}":    return Object.assign({}, state, { items: state.items.filter(function(x){ return x.id !== action.id; }) });
      case "RESET_${id}":          return { items: [], status: "idle", error: null };
      default: return state;
    }
  };
  module.exports = ${n}Reducer_${id};
};`;
    },
    (id) => {
        return `__webpack_modules__[${id}] = function(module, exports) {
  "use strict";
  var formatter_${id} = {
    truncate: function(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n) + "…" : s; },
    capitalize: function(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); },
    camelCase: function(s) { return String(s || "").replace(/[-_](.)/g, function(_, c){ return c.toUpperCase(); }); },
    kebabCase: function(s) { return String(s || "").replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, ""); },
    padLeft: function(s, n, c) { s = String(s); c = c || " "; while (s.length < n) s = c + s; return s; },
    pluralize: function(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }
  };
  module.exports = formatter_${id};
};`;
    },
];

// ─── Padding chunk generator ─────────────────────────────────────────────────
// Each padding chunk is wrapped in a named function expression that's never
// invoked, so the body is parsed but never executes.
function makePaddingChunk(targetBytes, startModuleId) {
    const header = `\n/* ─── synthetic bundle chunk (dead code — not invoked) ─── */\n` +
                   `var __pad_${startModuleId} = function __dead_${startModuleId}() {\n` +
                   `var __webpack_modules__ = {};\n`;
    const footer = `\nreturn __webpack_modules__;\n};\n`;
    let body = '';
    let id = startModuleId;
    while (header.length + body.length + footer.length < targetBytes) {
        body += TEMPLATES[id % TEMPLATES.length](id) + '\n';
        id++;
    }
    return { text: header + body + footer, nextId: id };
}

// ─── Main inflation with SCATTERED layout ────────────────────────────────────
//
// For main.js — split original into logical blocks (separated by blank lines).
// Layout becomes:
//
//   [padding chunk 1]
//   [real config block 1]    ← Cmd+F findable; not at line 1
//   [padding chunk 2]
//   [real config block 2]
//   ...
//   [real config block N-1]
//   [padding chunk N]
//   [window.APP_CONFIG]      ← must be LAST so it executes after all real blocks
//
function inflateScattered(filename, targetMB) {
    const filepath   = path.join(JS_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);

    let original;
    if (fs.existsSync(backupPath)) {
        original = fs.readFileSync(backupPath, 'utf8');
    } else {
        original = fs.readFileSync(filepath, 'utf8');
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        fs.writeFileSync(backupPath, original);
    }

    const targetBytes = targetMB * 1024 * 1024;
    const layout = LAYOUTS[filename](original);   // file-specific block split
    const numPaddingSlots = layout.paddingSlots;
    const totalPadding = targetBytes - original.length;
    const perSlot = Math.floor(totalPadding / numPaddingSlots);

    const idStart = filename === 'main.js'     ? 10000
                  : filename === 'app.js'      ? 30000
                  : filename === 'env.js'      ? 50000
                  : filename === 'firebase.js' ? 60000
                  : 70000;

    const result = layout.assemble(perSlot, idStart);
    fs.writeFileSync(filepath, result.text);
    const sizeMB = (result.text.length / 1024 / 1024).toFixed(2);
    const moduleCount = (result.lastId - idStart).toLocaleString();
    console.log(`  ${filename.padEnd(15)} ${sizeMB.padStart(6)} MB   (${moduleCount} synthetic modules · ${result.realBlocks} real config blocks)`);
}

// ─── Per-file layout strategies ─────────────────────────────────────────────
const LAYOUTS = {
    // main.js: scatter every config block, end with window.APP_CONFIG
    'main.js': function(original) {
        const blocks = original.split(/\n\n+/).filter(b => b.trim());
        // window.APP_CONFIG must run LAST so all vars are defined
        const appConfigIdx = blocks.findIndex(b => /window\.APP_CONFIG\s*=/.test(b));
        const appConfigBlock = appConfigIdx >= 0 ? blocks.splice(appConfigIdx, 1)[0] : null;

        return {
            paddingSlots: blocks.length + 1,  // padding before every block + 1 trailing
            assemble: (perSlot, idStart) => {
                let text = '';
                let id = idStart;
                // Top padding
                let chunk = makePaddingChunk(perSlot, id);
                text += chunk.text;
                id = chunk.nextId;
                // Alternate: real-block, padding, real-block, padding...
                for (const block of blocks) {
                    text += '\n' + block + '\n';
                    chunk = makePaddingChunk(perSlot, id);
                    text += chunk.text;
                    id = chunk.nextId;
                }
                // Final: window.APP_CONFIG (must run after all var defs)
                if (appConfigBlock) text += '\n' + appConfigBlock + '\n';
                return { text, lastId: id, realBlocks: blocks.length + (appConfigBlock ? 1 : 0) };
            }
        };
    },

    // app.js: real code MUST run at top (sessionStorage reads, redirects, etc.)
    // Padding goes at the bottom only.
    'app.js': function(original) {
        return {
            paddingSlots: 1,
            assemble: (perSlot, idStart) => {
                const chunk = makePaddingChunk(perSlot, idStart);
                return { text: original + '\n' + chunk.text, lastId: chunk.nextId, realBlocks: 1 };
            }
        };
    },

    // env.js: top padding, then window.ENV in the middle/bottom
    'env.js': function(original) {
        return {
            paddingSlots: 1,
            assemble: (perSlot, idStart) => {
                const chunk = makePaddingChunk(perSlot, idStart);
                return { text: chunk.text + '\n' + original, lastId: chunk.nextId, realBlocks: 1 };
            }
        };
    },

    // firebase.js: scatter firebaseConfig and FIREBASE_SERVICE_ACCOUNT across the file
    'firebase.js': function(original) {
        const blocks = original.split(/\n\n+/).filter(b => b.trim());
        return {
            paddingSlots: blocks.length + 1,
            assemble: (perSlot, idStart) => {
                let text = '';
                let id = idStart;
                let chunk = makePaddingChunk(perSlot, id);
                text += chunk.text;
                id = chunk.nextId;
                for (const block of blocks) {
                    text += '\n' + block + '\n';
                    chunk = makePaddingChunk(perSlot, id);
                    text += chunk.text;
                    id = chunk.nextId;
                }
                return { text, lastId: id, realBlocks: blocks.length };
            }
        };
    },
};

// ─── Entry ───────────────────────────────────────────────────────────────────
if (process.argv.includes('--restore')) {
    console.log('Restoring originals...');
    for (const file of Object.keys(TARGETS)) {
        fs.copyFileSync(path.join(BACKUP_DIR, file), path.join(JS_DIR, file));
        console.log(`  restored ${file}`);
    }
    process.exit(0);
}

console.log('\nInflating bundle files (secrets scattered across middle + bottom)...\n');
let totalMB = 0;
for (const [file, mb] of Object.entries(TARGETS)) {
    inflateScattered(file, mb);
    const stats = fs.statSync(path.join(JS_DIR, file));
    totalMB += stats.size / 1024 / 1024;
}
console.log(`\nTotal:                ${totalMB.toFixed(2)} MB across ${Object.keys(TARGETS).length} files`);
console.log(`Originals backed up to: ${BACKUP_DIR}`);
console.log(`To revert:              node inflate-bundle.js --restore\n`);
