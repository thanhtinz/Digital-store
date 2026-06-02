const RICH_EDITOR_SCRIPT = 'https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js';
const richEditorInstances = new Map();
let richEditorLoader = null;

function escapeEditorHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadTinyMCE() {
  if (window.tinymce) return Promise.resolve(window.tinymce);
  if (richEditorLoader) return richEditorLoader;
  richEditorLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RICH_EDITOR_SCRIPT;
    script.referrerPolicy = 'origin';
    script.onload = () => resolve(window.tinymce);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return richEditorLoader;
}

function syncRichTextEditors() {
  richEditorInstances.forEach(instance => instance.sync?.());
  if (window.tinymce) window.tinymce.triggerSave();
}

function createFallbackEditor({ sourceTextarea, toolbarId, previewId, placeholder, minHeight }) {
  const existingWrapper = sourceTextarea.nextElementSibling?.classList?.contains('rich-editor')
    ? sourceTextarea.nextElementSibling
    : null;
  if (existingWrapper) existingWrapper.remove();

  const wrapper = document.createElement('div');
  wrapper.className = 'rich-editor rich-editor-fallback';
  wrapper.innerHTML = `
    <div class="rich-editor-surface" contenteditable="true" style="min-height:${minHeight}px" data-placeholder="${escapeEditorHtml(placeholder)}"></div>
  `;

  sourceTextarea.style.display = 'none';
  sourceTextarea.parentNode.insertBefore(wrapper, sourceTextarea.nextSibling);

  const surface = qs('.rich-editor-surface', wrapper);
  surface.innerHTML = sourceTextarea.value || '';

  const sync = () => {
    sourceTextarea.value = surface.innerHTML.trim() === '<br>' ? '' : surface.innerHTML;
    if (previewId) {
      const preview = qs(`#${previewId}`);
      if (preview) preview.innerHTML = sourceTextarea.value;
    }
  };

  const exec = (command, value = null) => {
    surface.focus();
    document.execCommand(command, false, value);
    sync();
  };

  const toolbar = toolbarId ? qs(`#${toolbarId}`) : null;
  if (toolbar) {
    toolbar.onclick = (e) => {
      const btn = e.target.closest('[data-editor-action]');
      if (!btn) return;
      const action = btn.dataset.editorAction;
      if (action === 'link') return exec('createLink', prompt('Nhập URL') || null);
      if (action === 'image') return exec('insertImage', prompt('Nhập URL ảnh') || null);
      if (action === 'html') return exec('insertHTML', prompt('Nhập HTML') || null);
      if (action === 'removeFormat') return exec('removeFormat');
      const commandMap = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough', h2: 'formatBlock', h3: 'formatBlock', quote: 'formatBlock', ul: 'insertUnorderedList', ol: 'insertOrderedList' };
      if (action === 'h2') return exec(commandMap[action], 'h2');
      if (action === 'h3') return exec(commandMap[action], 'h3');
      if (action === 'quote') return exec(commandMap[action], 'blockquote');
      if (commandMap[action]) exec(commandMap[action]);
    };
  }

  surface.addEventListener('input', sync);
  surface.addEventListener('blur', sync);
  sync();

  return {
    sync,
    getHTML: () => { sync(); return sourceTextarea.value; },
    setHTML: (html) => { surface.innerHTML = html || ''; sync(); },
    destroy: () => { sync(); wrapper.remove(); sourceTextarea.style.display = ''; },
  };
}

function createRichTextEditor({
  textarea = null,
  textareaId = null,
  toolbarId = null,
  previewId = null,
  placeholder = 'Nhập nội dung...',
  minHeight = 320,
}) {
  const sourceTextarea = textarea || (textareaId ? qs(`#${textareaId}`) : null);
  if (!sourceTextarea) return null;

  if (!sourceTextarea.id) sourceTextarea.id = `rich-editor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const editorId = sourceTextarea.id;

  const existing = richEditorInstances.get(editorId);
  if (existing) existing.destroy?.();
  if (window.tinymce?.get(editorId)) window.tinymce.get(editorId).remove();

  sourceTextarea.classList.add('rich-editor-textarea');
  sourceTextarea.style.minHeight = `${minHeight}px`;

  let tinyEditor = null;
  let fallback = null;

  const sync = () => {
    if (tinyEditor) sourceTextarea.value = tinyEditor.getContent();
    else fallback?.sync?.();
    if (previewId) {
      const preview = qs(`#${previewId}`);
      if (preview) preview.innerHTML = sourceTextarea.value;
    }
  };

  const api = {
    sync,
    ready: null,
    getHTML: () => { sync(); return sourceTextarea.value; },
    setHTML: (html) => {
      if (tinyEditor) tinyEditor.setContent(html || '');
      else if (fallback) fallback.setHTML(html || '');
      else sourceTextarea.value = html || '';
      sync();
    },
    destroy: () => {
      sync();
      if (tinyEditor) tinyEditor.remove();
      fallback?.destroy?.();
      if (legacyToolbar) legacyToolbar.style.display = '';
      richEditorInstances.delete(editorId);
    },
  };
  richEditorInstances.set(editorId, api);

  if (sourceTextarea.form) {
    sourceTextarea.form.addEventListener('submit', syncRichTextEditors, true);
  }

  const legacyToolbar = toolbarId ? qs(`#${toolbarId}`) : null;

  api.ready = loadTinyMCE()
    .then(tinymce => tinymce.init({
      selector: `#${CSS.escape(editorId)}`,
      license_key: 'gpl',
      base_url: 'https://cdn.jsdelivr.net/npm/tinymce@6',
      suffix: '.min',
      promotion: false,
      branding: false,
      height: minHeight,
      min_height: minHeight,
      menubar: 'file edit insert view format table tools help',
      plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount autoresize',
      toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table blockquote | removeformat code fullscreen preview',
      toolbar_mode: 'sliding',
      placeholder,
      convert_urls: false,
      entity_encoding: 'raw',
      content_style: `
        body { font-family: Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.75; color: #0f172a; padding: 12px; }
        img { max-width: 100%; height: auto; border-radius: 12px; }
        blockquote { border-left: 3px solid #334155; margin: 12px 0; padding: 10px 14px; background: rgba(51,65,85,.08); border-radius: 10px; }
        table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #dbe3ef; padding: 8px; }
      `,
      setup(editor) {
        editor.on('init', () => {
          tinyEditor = editor;
          if (legacyToolbar) legacyToolbar.style.display = 'none';
          sync();
        });
        editor.on('change keyup undo redo input blur', sync);
      },
    }))
    .catch(() => {
      fallback = createFallbackEditor({ sourceTextarea, toolbarId, previewId, placeholder, minHeight });
      return fallback;
    });

  return api;
}

window.createRichTextEditor = createRichTextEditor;
window.syncRichTextEditors = syncRichTextEditors;
