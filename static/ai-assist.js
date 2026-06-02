/**
 * AI Assist — ✨ buttons for auto-generating content in admin fields.
 *
 * Usage: call `initAiButtons(container)` after rendering an admin page.
 * It scans for textarea and text inputs, injects a small ✨ button next
 * to each label. Clicking calls POST /api/admin/ai/generate.
 */

(function () {
  'use strict';

  const AI_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.09 3.26L16.36 6.4l-2.63 2.09.64 3.51L12 10.24 9.63 12l.64-3.51L7.64 6.4l3.27-1.14z"/><path d="M5 19l1.5-4.5L2 12l4.5-1.5L5 5l1.5 4.5L12 8l-1.5 4.5L12 19l-1.5-4.5L5 19z"/></svg>`;

  // Map input IDs / name patterns to field_type for better prompts
  const FIELD_TYPE_MAP = [
    [/title|tieu-de/i, 'title'],
    [/name|ten/i, 'name'],
    [/seo.?title/i, 'seo_title'],
    [/seo.?desc/i, 'seo_description'],
    [/seo.?keyword|keyword/i, 'seo_keywords'],
    [/excerpt|tom-tat/i, 'blog_excerpt'],
    [/content|noi-dung/i, 'blog_content'],
    [/desc|mo-ta/i, 'description'],
    [/page.?content|support/i, 'support_content'],
    [/announcement|thong-bao/i, 'announcement'],
  ];

  // IDs to skip (passwords, URLs, numbers, selects, hidden inputs)
  const SKIP_PATTERNS = [
    /password/i, /token/i, /key/i, /secret/i, /url/i, /link/i,
    /email/i, /phone/i, /price/i, /quantity/i, /stock/i, /sort/i,
    /order/i, /upload/i, /file/i, /image/i, /logo/i, /favicon/i,
    /color/i, /code/i, /slug/i, /percent/i, /rate/i, /lock/i,
    /duration/i, /max/i, /cron/i, /path/i, /ip/i, /admin/i,
    /captcha/i, /script/i, /header_script/i, /footer_script/i,
    /baseurl/i, /apikey/i, /api.key/i, /bot/i, /telegram/i, /discord/i,
    /smtp/i, /mail/i, /host/i, /port/i, /client.?id/i, /payment/i, /payos/i,
    /auth/i, /bank/i, /account/i
  ];

  function detectFieldType(el) {
    const id = (el.id || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const label = el.closest('.form-group')?.querySelector('.form-label')?.textContent?.toLowerCase() || '';
    const combined = `${id} ${placeholder} ${label}`;

    for (const [regex, type] of FIELD_TYPE_MAP) {
      if (regex.test(combined)) return type;
    }
    return el.tagName === 'TEXTAREA' ? 'description' : 'general';
  }

  function shouldSkip(el) {
    const id = (el.id || '').toLowerCase();
    if (!id) return true;
    const type = el.type || '';
    if (['password', 'number', 'email', 'url', 'hidden', 'file', 'color', 'date', 'range'].includes(type)) return true;
    if (el.disabled || el.readOnly) return true;
    for (const p of SKIP_PATTERNS) {
      if (p.test(id)) return true;
    }
    return false;
  }

  function gatherContext(el) {
    const form = el.closest('form') || el.closest('.modal-content') || el.closest('.settings-card') || el.parentElement;
    if (!form) return '';

    const parts = [];
    // Grab nearby filled inputs for context
    form.querySelectorAll('input[type="text"], textarea, select').forEach(inp => {
      if (inp === el || !inp.value?.trim()) return;
      const lbl = inp.closest('.form-group')?.querySelector('.form-label')?.textContent?.trim();
      if (lbl && inp.value.trim().length < 500) {
        parts.push(`${lbl}: ${inp.value.trim()}`);
      }
    });
    return parts.slice(0, 10).join('\n');
  }

  function getOrCreateEditor(el) {
    // Check if this textarea has a TinyMCE / rich editor
    if (window.tinymce) {
      const editor = window.tinymce.get(el.id);
      if (editor) return {
        getValue: () => editor.getContent(),
        setValue: (v) => editor.setContent(v),
      };
    }
    // Check richEditorInstances (custom editor)
    if (window.richEditorInstances) {
      const inst = window.richEditorInstances.get(el.id);
      if (inst) return {
        getValue: () => inst.getHTML(),
        setValue: (v) => inst.setHTML(v),
      };
    }
    return {
      getValue: () => el.value,
      setValue: (v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); },
    };
  }

  async function generateForField(el, btn) {
    const fieldType = detectFieldType(el);
    const context = gatherContext(el);
    const editor = getOrCreateEditor(el);
    const currentVal = editor.getValue()?.trim();

    const label = el.closest('.form-group')?.querySelector('.form-label')?.textContent?.trim() || '';
    
    // Thu thập context liên quan trong form để gửi cho bot
    let extraContext = '';
    const form = el.closest('.modal-content') || document.querySelector('.admin-content');
    if (form) {
      const titleField = form.querySelector('#prod-name') || form.querySelector('#bp-title') || form.querySelector('#cat-name') || form.querySelector('input[id*="title"], input[id*="name"]');
      if (titleField && titleField.value) {
        extraContext += `Tên/Tiêu đề: ${titleField.value}\n`;
      }
      const catField = form.querySelector('#prod-category option:checked') || form.querySelector('#bp-category option:checked');
      if (catField && catField.textContent) {
        extraContext += `Danh mục: ${catField.textContent}\n`;
      }
    }

    let prompt = `Viết nội dung cho trường "${label}"`;
    if (extraContext) {
      prompt += ` dựa trên thông tin chính sau:\n${extraContext}`;
    }
    if (context) {
       prompt += `\nVà các thông tin phụ: ${context}`;
    }
    
    if (currentVal) {
      prompt += `\nNội dung hiện tại:\n"${currentVal.substring(0, 200)}"\nHãy cải thiện hoặc viết lại đoạn văn này hay hơn, hấp dẫn hơn. Không trả về các câu dẫn nhập như "Đây là nội dung của bạn", chỉ trả về kết quả cuối cùng.`;
    } else {
       prompt += `\nHãy viết nội dung phù hợp, chuyên nghiệp, hấp dẫn. Không trả về các câu dẫn nhập như "Đây là nội dung của bạn", chỉ trả về kết quả cuối cùng.`;
    }

    btn.classList.add('ai-btn-loading');
    btn.disabled = true;

    try {
      const res = await window.apiFetch('/admin/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          context,
          field_type: fieldType,
          max_tokens: fieldType.includes('content') ? 4096 : 1024,
        }),
      });

      if (res.content) {
        editor.setValue(res.content);
        // Flash success
        btn.classList.add('ai-btn-success');
        setTimeout(() => btn.classList.remove('ai-btn-success'), 1500);
      }
    } catch (err) {
      if (window.toast) window.toast(err.message || 'Lỗi AI', 'error');
      btn.classList.add('ai-btn-error');
      setTimeout(() => btn.classList.remove('ai-btn-error'), 1500);
    } finally {
      btn.classList.remove('ai-btn-loading');
      btn.disabled = false;
    }
  }

  function injectButton(el) {
    if (el.dataset.aiBtn) return; // already injected
    el.dataset.aiBtn = '1';

    const label = el.closest('.form-group')?.querySelector('.form-label');
    if (!label) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-btn';
    btn.title = 'AI tự viết';
    btn.innerHTML = `${AI_ICON} AI`;
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      generateForField(el, btn);
    };

    label.style.position = 'relative';
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '6px';
    label.appendChild(btn);
  }

  window.initAiButtons = function (container) {
    if (!container) return;
    // Small delay to let DOM settle (modals, dynamic content)
    setTimeout(() => {
      // Chỉ áp dụng cho textarea (nội dung lớn) và các thẻ input type text mà có ID nằm trong nhóm nội dung (seo, desc, content, title)
      // Loại bỏ các thẻ input nhỏ lẻ
      const textareas = container.querySelectorAll('textarea');
      const inputs = container.querySelectorAll('input[type="text"]');
      
      textareas.forEach(el => {
        if (!shouldSkip(el)) injectButton(el);
      });

      inputs.forEach(el => {
        if (shouldSkip(el)) return;
        const id = (el.id || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        // Chỉ lấy những thẻ input text có từ khóa liên quan đến content lớn
        if (/seo.?desc|excerpt|mo-ta|tom-tat|noi-dung|content/i.test(id) || 
            /seo.?desc|excerpt|mo-ta|tom-tat|noi-dung|content/i.test(name)) {
          injectButton(el);
        }
      });
    }, 100);
  };
})();
