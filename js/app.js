(() => {
  let allBlocks = [];
  let selection = { categoryId: CATEGORIES[0].id, subcategoryId: null }; // subcategoryId null = "전체"
  let editingBlockId = null;
  let currentBlockId = null;
  let workingSegments = []; // [{type:'text', id, text}] | [{type:'image', id, images:[{id,url}]}]
  let workingThumbnailIds = []; // 최대 2개, 선택 순서 유지

  const $ = sel => document.querySelector(sel);

  const categoryNav = $('#categoryNav');
  const blockGrid = $('#blockGrid');
  const emptyState = $('#emptyState');
  const breadcrumb = $('#breadcrumb');

  const viewModal = $('#viewModal');
  const viewSegments = $('#viewSegments');
  const viewMeta = $('#viewMeta');
  const viewTitle = $('#viewTitle');

  const editModal = $('#editModal');
  const editModalTitle = $('#editModalTitle');
  const editCategorySelect = $('#editCategorySelect');
  const editSubcategorySelect = $('#editSubcategorySelect');
  const editTitleInput = $('#editTitleInput');
  const editSegmentList = $('#editSegmentList');
  const addTextSegmentBtn = $('#addTextSegmentBtn');
  const addImageSegmentBtn = $('#addImageSegmentBtn');
  const editSaveBtn = $('#editSaveBtn');

  function icons() {
    if (window.lucide) lucide.createIcons();
  }

  // lucide에 없는 아이콘을 직접 그려서 채워넣은 것 (lucide와 같은 24x24 스트로크 스타일)
  const CUSTOM_ICONS = {
    butterfly: `<path d="M12 9C15.5 4.5 19 1.5 21 2.5C23 3.5 23.5 6.5 23 10C22.6 12.5 19.5 14 15.5 13.8"/><path d="M12 9C8.5 4.5 5 1.5 3 2.5C1 3.5 .5 6.5 1 10C1.4 12.5 4.5 14 8.5 13.8"/><path d="M8.5 13.8C5.3 14.3 3 16 3 18C3 19.8 4.5 21 6.5 21C9.3 21 11.3 18.7 12 16"/><path d="M15.5 13.8C18.7 14.3 21 16 21 18C21 19.8 19.5 21 17.5 21C14.7 21 12.7 18.7 12 16"/>`,
    basketball: `<defs><clipPath id="bballClip"><circle cx="12" cy="12" r="10"/></clipPath></defs><circle cx="12" cy="12" r="10"/><g clip-path="url(#bballClip)"><path d="M2 12h20"/><path d="M12 2v20"/><path d="M3 4Q12 12 3 20"/><path d="M21 4Q12 12 21 20"/></g>`
  };

  function iconHTML(name) {
    if (CUSTOM_ICONS[name]) {
      return `<svg class="custom-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CUSTOM_ICONS[name]}</svg>`;
    }
    return `<i data-lucide="${name}"></i>`;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('hidden'), 2200);
  }

  function uid() {
    return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- 텍스트 박스 서식(굵게/기울임/취소선/색/아이콘/토글) ----------
  // 저장은 항상 이 가벼운 마크업 문법의 순수 텍스트로 한다 (contenteditable
  // 없이 textarea + 툴바 버튼으로 마크업을 삽입/제거하는 방식).
  //   **굵게**  *기울임*  ~~취소선~~
  //   [gray]..[/gray] [accent]..[/accent] [red]..[/red]
  //   [icon:아이콘이름]
  //   [toggle:제목]\n내용\n[/toggle]
  const RICH_TEXT_ICONS = CATEGORIES.map(c => c.icon);

  function renderInlineMarkup(escapedText) {
    let html = escapedText;
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/\[gray\](.+?)\[\/gray\]/g, '<span class="rt-gray">$1</span>');
    html = html.replace(/\[accent\](.+?)\[\/accent\]/g, '<span class="rt-accent">$1</span>');
    html = html.replace(/\[red\](.+?)\[\/red\]/g, '<span class="rt-red">$1</span>');
    html = html.replace(/\[icon:([a-z0-9-]+)\]/g, (m, name) =>
      `<span class="rt-icon">${iconHTML(name)}</span>`);
    return html;
  }

  function renderRichText(rawText) {
    const escaped = escapeHTML(rawText || '');
    const toggles = [];
    let working = escaped.replace(/\[toggle:(.*?)\]\n?([\s\S]*?)\[\/toggle\]/g, (match, title, body) => {
      const idx = toggles.length;
      const titleHTML = renderInlineMarkup(title.trim());
      const bodyHTML = renderInlineMarkup(body.trim()).replace(/\n/g, '<br>');
      toggles.push(
        `<div class="text-toggle">` +
          `<button type="button" class="text-toggle-header">` +
            `<i data-lucide="chevron-right" class="toggle-chevron toggle-chevron-closed"></i>` +
            `<i data-lucide="chevron-down" class="toggle-chevron toggle-chevron-open"></i>` +
            `<span>${titleHTML}</span>` +
          `</button>` +
          `<div class="toggle-body" hidden>${bodyHTML}</div>` +
        `</div>`
      );
      return ` TOGGLE${idx} `;
    });
    working = renderInlineMarkup(working);
    working = working.replace(/\n/g, '<br>');
    working = working.replace(/ TOGGLE(\d+) /g, (m, i) => toggles[Number(i)]);
    return working;
  }

  function wrapSelection(textarea, before, after = before) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end);
    textarea.value = value.slice(0, start) + before + selected + after + value.slice(end);
    textarea.focus();
    if (selected) {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    } else {
      textarea.selectionStart = textarea.selectionEnd = start + before.length;
    }
    textarea.dispatchEvent(new Event('input'));
  }

  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.slice(0, start) + text + value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
    textarea.dispatchEvent(new Event('input'));
  }

  // ---------- 옛 데이터 형식(content + images + imageLayout) 호환 ----------
  // 예전에 저장된 카드는 segments 필드가 없다. 화면에 쓸 때만 즉석으로
  // segments 배열로 변환해서 다룬다 (저장은 항상 새 형식으로 한다).
  function buildGalleryRows(images, layout) {
    const validLayout = layout && layout.reduce((sum, n) => sum + n, 0) === images.length
      ? layout
      : images.map(() => 1);
    let idx = 0;
    return validLayout.map(size => {
      const row = images.slice(idx, idx + size);
      idx += size;
      return row;
    });
  }

  function migrateBlockToSegments(block) {
    if (block.segments) return block.segments;
    const segments = [];
    if (block.content) {
      segments.push({ type: 'text', id: uid(), text: block.content });
    }
    buildGalleryRows(block.images || [], block.imageLayout).forEach(row => {
      if (row.length) segments.push({ type: 'image', id: uid(), images: row });
    });
    return segments;
  }

  function allImages(block) {
    return migrateBlockToSegments(block)
      .filter(seg => seg.type === 'image')
      .flatMap(seg => seg.images);
  }

  // ---------- 사이드바 ----------
  function renderSidebar() {
    categoryNav.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const count = allBlocks.filter(b => cat.subs.some(s => s.id === b.subcategoryId)).length;
      const isOpenCat = selection.categoryId === cat.id;

      const catEl = document.createElement('div');
      catEl.className = 'nav-category' + (isOpenCat ? ' open' : '');

      const head = document.createElement('button');
      head.className = 'nav-category-head' + (isOpenCat && !selection.subcategoryId ? ' active' : '');
      head.innerHTML = `
        <span class="cat-icon">${iconHTML(cat.icon)}</span>
        <span class="cat-name">${cat.name}</span>
        <span class="cat-count">${count}</span>
        <i data-lucide="chevron-down" class="chevron"></i>
      `;
      head.addEventListener('click', () => {
        selection = { categoryId: cat.id, subcategoryId: null };
        renderSidebar();
        renderMain();
      });

      const subList = document.createElement('div');
      subList.className = 'nav-sub-list';
      cat.subs.forEach(sub => {
        const subCount = allBlocks.filter(b => b.subcategoryId === sub.id).length;
        const subBtn = document.createElement('button');
        subBtn.className = 'nav-sub-item' + (selection.subcategoryId === sub.id ? ' active' : '');
        subBtn.innerHTML = `<span>${sub.name}</span><span class="cat-count">${subCount}</span>`;
        subBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selection = { categoryId: cat.id, subcategoryId: sub.id };
          renderSidebar();
          renderMain();
          closeMobileSidebar();
        });
        subList.appendChild(subBtn);
      });

      catEl.appendChild(head);
      catEl.appendChild(subList);
      categoryNav.appendChild(catEl);
    });
    icons();
  }

  // ---------- 메인 그리드 ----------
  function currentCategory() {
    return CATEGORIES.find(c => c.id === selection.categoryId);
  }

  function visibleBlocks() {
    const cat = currentCategory();
    if (!cat) return [];
    let blocks;
    if (selection.subcategoryId) {
      blocks = allBlocks.filter(b => b.subcategoryId === selection.subcategoryId);
    } else {
      const subIds = cat.subs.map(s => s.id);
      blocks = allBlocks.filter(b => subIds.includes(b.subcategoryId));
    }
    return blocks.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
  }

  function renderBreadcrumb() {
    const cat = currentCategory();
    if (!cat) { breadcrumb.textContent = ''; return; }
    if (selection.subcategoryId) {
      const sub = cat.subs.find(s => s.id === selection.subcategoryId);
      breadcrumb.innerHTML = `<span class="crumb-muted">${cat.name}</span> <i data-lucide="chevron-right"></i> ${sub ? sub.name : ''}`;
    } else {
      breadcrumb.innerHTML = `${cat.name} <span class="crumb-muted">전체</span>`;
    }
    icons();
  }

  function thumbnailHTML(block) {
    const images = allImages(block);
    const thumbs = (block.thumbnailIds || [])
      .map(id => images.find(img => img.id === id))
      .filter(Boolean);
    const source = thumbs.length ? thumbs : (images.length ? [images[0]] : []);

    if (!source.length) {
      return `<div class="thumb-empty"><i data-lucide="image"></i></div>`;
    }
    return source.map(img => `<div class="thumb-half"><img src="${img.url}" alt="" loading="lazy"></div>`).join('');
  }

  function renderGrid() {
    const blocks = visibleBlocks();
    blockGrid.innerHTML = '';

    if (!blocks.length) {
      emptyState.classList.remove('hidden');
      blockGrid.classList.add('hidden');
      icons();
      return;
    }
    emptyState.classList.add('hidden');
    blockGrid.classList.remove('hidden');

    blocks.forEach(block => {
      const thumbCount = (block.thumbnailIds && block.thumbnailIds.length) || (allImages(block).length ? 1 : 0);
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-thumb thumb-count-${thumbCount}">
          ${thumbnailHTML(block)}
        </div>
        <div class="card-title">${escapeHTML(block.title || '(제목 없음)')}</div>
      `;
      card.addEventListener('click', () => openViewModal(block.id));
      blockGrid.appendChild(card);
    });
    icons();
  }

  function renderMain() {
    renderBreadcrumb();
    renderGrid();
  }

  // ---------- 상세 보기 모달 ----------
  function segmentViewHTML(seg) {
    if (seg.type === 'text') {
      return `<div class="view-text-block">${renderRichText(seg.text || '')}</div>`;
    }
    const cls = seg.images.length > 1 ? 'gallery-row multi' : 'gallery-row single';
    return `<div class="${cls}">${seg.images.map(img => `<img src="${img.url}" alt="" loading="lazy">`).join('')}</div>`;
  }

  function openViewModal(blockId) {
    const block = allBlocks.find(b => b.id === blockId);
    if (!block) return;
    viewModal.dataset.blockId = blockId;

    const segments = migrateBlockToSegments(block);
    viewSegments.innerHTML = segments.map(segmentViewHTML).join('');

    const sub = findSub(block.subcategoryId);
    const cat = findCategoryBySub(block.subcategoryId);
    viewMeta.textContent = cat ? `${cat.name} · ${sub.name}` : '';
    viewTitle.textContent = block.title || '(제목 없음)';

    viewModal.classList.remove('hidden');
    icons();
  }

  function closeViewModal() {
    viewModal.classList.add('hidden');
    viewModal.dataset.blockId = '';
  }

  $('[data-close-view]').addEventListener('click', closeViewModal);
  viewModal.addEventListener('click', e => {
    if (e.target === viewModal) { closeViewModal(); return; }
    const header = e.target.closest('.text-toggle-header');
    if (header) {
      const wrap = header.closest('.text-toggle');
      const body = wrap.querySelector('.toggle-body');
      wrap.classList.toggle('open');
      body.hidden = !wrap.classList.contains('open');
    }
  });

  $('#viewEditBtn').addEventListener('click', () => {
    const id = viewModal.dataset.blockId;
    closeViewModal();
    openEditModal(id);
  });

  $('#viewDeleteBtn').addEventListener('click', async () => {
    const id = viewModal.dataset.blockId;
    const block = allBlocks.find(b => b.id === id);
    if (!block) return;
    if (!confirm('이 카드를 삭제할까요? 되돌릴 수 없어요.')) return;
    try {
      await LookbookFirebase.removeBlock(block);
      closeViewModal();
      toast('카드를 삭제했어요.');
    } catch (err) {
      console.error(err);
      toast('삭제에 실패했어요. 다시 시도해주세요.');
    }
  });

  // ---------- 추가/수정 모달 ----------
  function populateCategorySelects(selectedCatId, selectedSubId) {
    editCategorySelect.innerHTML = CATEGORIES.map(c =>
      `<option value="${c.id}">${c.name}</option>`).join('');
    editCategorySelect.value = selectedCatId;
    populateSubSelect(selectedCatId, selectedSubId);
  }

  function populateSubSelect(catId, selectedSubId) {
    const cat = CATEGORIES.find(c => c.id === catId);
    editSubcategorySelect.innerHTML = cat.subs.map(s =>
      `<option value="${s.id}">${s.name}</option>`).join('');
    if (selectedSubId && cat.subs.some(s => s.id === selectedSubId)) {
      editSubcategorySelect.value = selectedSubId;
    }
  }

  editCategorySelect.addEventListener('change', () => {
    populateSubSelect(editCategorySelect.value, null);
  });

  function openEditModal(blockId) {
    const block = blockId ? allBlocks.find(b => b.id === blockId) : null;
    editingBlockId = block ? block.id : null;
    currentBlockId = block ? block.id : uid();

    editModalTitle.textContent = block ? '카드 수정' : '새 카드 추가';
    editTitleInput.value = block ? block.title || '' : '';
    workingSegments = block
      ? migrateBlockToSegments(block).map(seg => seg.type === 'text'
        ? { type: 'text', id: seg.id, text: seg.text || '' }
        : { type: 'image', id: seg.id, images: seg.images.map(img => ({ id: img.id, url: img.url })) })
      : [];
    workingThumbnailIds = block ? [...(block.thumbnailIds || [])] : [];

    const defaultCat = block ? findCategoryBySub(block.subcategoryId).id : (selection.categoryId || CATEGORIES[0].id);
    const defaultSub = block ? block.subcategoryId : (selection.subcategoryId || CATEGORIES.find(c => c.id === defaultCat).subs[0].id);
    populateCategorySelects(defaultCat, defaultSub);

    renderSegmentList();
    editModal.classList.remove('hidden');
    icons();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editingBlockId = null;
    currentBlockId = null;
    workingSegments = [];
    workingThumbnailIds = [];
  }

  $('[data-close-edit]').addEventListener('click', closeEditModal);
  $('#editCancelBtn').addEventListener('click', closeEditModal);
  editModal.addEventListener('click', e => {
    if (e.target === editModal) { closeEditModal(); return; }
    editModal.querySelectorAll('.rt-icon-menu').forEach(menu => {
      if (!menu.closest('.rt-icon-picker').contains(e.target)) menu.classList.add('hidden');
    });
  });

  $('#addBlockBtn').addEventListener('click', () => openEditModal(null));
  $('#emptyAddBtn').addEventListener('click', () => openEditModal(null));

  // ---------- 구성(텍스트/이미지 박스) 편집 ----------
  function addTextSegment() {
    workingSegments.push({ type: 'text', id: uid(), text: '' });
    renderSegmentList();
  }

  function addImageSegment() {
    workingSegments.push({ type: 'image', id: uid(), images: [] });
    renderSegmentList();
  }

  addTextSegmentBtn.addEventListener('click', addTextSegment);
  addImageSegmentBtn.addEventListener('click', addImageSegment);

  function moveSegment(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= workingSegments.length) return;
    const [seg] = workingSegments.splice(index, 1);
    workingSegments.splice(target, 0, seg);
    renderSegmentList();
  }

  function removeSegment(index) {
    const seg = workingSegments[index];
    workingThumbnailIds = workingThumbnailIds.filter(id =>
      !(seg.type === 'image' && seg.images.some(img => img.id === id)));
    workingSegments.splice(index, 1);
    renderSegmentList();
  }

  function buildImageCell(img, seg) {
    const thumbIndex = workingThumbnailIds.indexOf(img.id);
    const cell = document.createElement('div');
    cell.className = 'image-manage-cell' + (thumbIndex > -1 ? ' selected' : '');
    cell.innerHTML = `
      <img src="${img.url}" alt="" onerror="this.closest('.image-manage-cell').classList.add('broken')">
      <button type="button" class="image-remove" title="이미지 삭제"><i data-lucide="x"></i></button>
      <button type="button" class="image-thumb-toggle" title="썸네일로 선택">
        ${thumbIndex > -1 ? `<span class="thumb-badge">${thumbIndex + 1}</span>` : `<i data-lucide="star"></i>`}
      </button>
    `;
    cell.querySelector('.image-remove').addEventListener('click', () => {
      seg.images = seg.images.filter(i => i.id !== img.id);
      workingThumbnailIds = workingThumbnailIds.filter(id => id !== img.id);
      renderSegmentList();
    });
    cell.querySelector('.image-thumb-toggle').addEventListener('click', () => {
      const idx = workingThumbnailIds.indexOf(img.id);
      if (idx > -1) {
        workingThumbnailIds.splice(idx, 1);
      } else {
        if (workingThumbnailIds.length >= 2) {
          toast('썸네일은 최대 2개까지 선택할 수 있어요.');
          return;
        }
        workingThumbnailIds.push(img.id);
      }
      renderSegmentList();
    });
    return cell;
  }

  function buildRichTextToolbar(textarea) {
    const toolbar = document.createElement('div');
    toolbar.className = 'rt-toolbar';
    toolbar.innerHTML = `
      <button type="button" class="rt-btn" data-wrap="**" title="굵게"><b>B</b></button>
      <button type="button" class="rt-btn rt-italic" data-wrap="*" title="기울임">I</button>
      <button type="button" class="rt-btn rt-strike" data-wrap="~~" title="취소선">S</button>
      <span class="rt-sep"></span>
      <button type="button" class="rt-btn rt-swatch rt-swatch-gray" data-color="gray" title="회색 글씨"></button>
      <button type="button" class="rt-btn rt-swatch rt-swatch-accent" data-color="accent" title="포인트 색 글씨"></button>
      <button type="button" class="rt-btn rt-swatch rt-swatch-red" data-color="red" title="빨간 글씨"></button>
      <span class="rt-sep"></span>
      <div class="rt-icon-picker">
        <button type="button" class="rt-btn" title="아이콘 삽입"><i data-lucide="smile-plus"></i></button>
        <div class="rt-icon-menu hidden">
          ${RICH_TEXT_ICONS.map(name => `<button type="button" class="rt-icon-option" data-icon="${name}">${iconHTML(name)}</button>`).join('')}
        </div>
      </div>
      <button type="button" class="rt-btn" data-toggle-insert title="토글(펼침/접힘) 삽입"><i data-lucide="chevron-right"></i></button>
    `;

    toolbar.querySelectorAll('[data-wrap]').forEach(btn => {
      btn.addEventListener('click', () => wrapSelection(textarea, btn.dataset.wrap));
    });
    toolbar.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = btn.dataset.color;
        wrapSelection(textarea, `[${c}]`, `[/${c}]`);
      });
    });

    const iconPicker = toolbar.querySelector('.rt-icon-picker');
    const iconMenu = toolbar.querySelector('.rt-icon-menu');
    iconPicker.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      iconMenu.classList.toggle('hidden');
    });
    iconMenu.querySelectorAll('.rt-icon-option').forEach(btn => {
      btn.addEventListener('click', () => {
        insertAtCursor(textarea, `[icon:${btn.dataset.icon}]`);
        iconMenu.classList.add('hidden');
      });
    });

    toolbar.querySelector('[data-toggle-insert]').addEventListener('click', () => {
      insertAtCursor(textarea, '[toggle:제목]\n내용\n[/toggle]');
    });

    icons();
    return toolbar;
  }

  function buildSegmentBox(seg, index) {
    const box = document.createElement('div');
    box.className = 'segment-box';

    const header = document.createElement('div');
    header.className = 'segment-box-header';
    header.innerHTML = `
      <span class="segment-type-label">
        <i data-lucide="${seg.type === 'text' ? 'type' : 'image'}"></i>
        ${seg.type === 'text' ? '텍스트' : '이미지'}
      </span>
      <div class="segment-controls">
        <button type="button" class="seg-btn seg-up" title="위로"><i data-lucide="chevron-up"></i></button>
        <button type="button" class="seg-btn seg-down" title="아래로"><i data-lucide="chevron-down"></i></button>
        <button type="button" class="seg-btn seg-remove" title="박스 삭제"><i data-lucide="trash-2"></i></button>
      </div>
    `;
    header.querySelector('.seg-up').addEventListener('click', () => moveSegment(index, -1));
    header.querySelector('.seg-down').addEventListener('click', () => moveSegment(index, 1));
    header.querySelector('.seg-remove').addEventListener('click', () => removeSegment(index));
    box.appendChild(header);

    if (seg.type === 'text') {
      const textarea = document.createElement('textarea');
      textarea.className = 'segment-textarea';
      textarea.rows = 4;
      textarea.placeholder = '설정, 메모, 디자인 노트 등을 자유롭게 적어주세요';
      textarea.value = seg.text || '';
      textarea.addEventListener('input', () => { seg.text = textarea.value; });

      box.appendChild(buildRichTextToolbar(textarea));
      box.appendChild(textarea);
    } else {
      const urlRow = document.createElement('div');
      urlRow.className = 'image-url-row';
      urlRow.innerHTML = `
        <input type="url" placeholder="이미지 주소(URL)를 붙여넣으세요">
        <button type="button" class="secondary-btn"><i data-lucide="plus"></i> 추가</button>
      `;
      const urlInput = urlRow.querySelector('input');
      const addBtn = urlRow.querySelector('button');
      const addFn = () => {
        const url = urlInput.value.trim();
        if (!url) return;
        seg.images.push({ id: uid(), url });
        renderSegmentList();
      };
      addBtn.addEventListener('click', addFn);
      urlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addFn(); }
      });
      box.appendChild(urlRow);

      const grid = document.createElement('div');
      grid.className = 'image-manage-grid';
      if (!seg.images.length) {
        grid.innerHTML = `<p class="hint">이 박스에 아직 이미지가 없어요. 여러 장을 넣으면 나란히 묶여요.</p>`;
      } else {
        seg.images.forEach(img => grid.appendChild(buildImageCell(img, seg)));
      }
      box.appendChild(grid);
    }

    return box;
  }

  function renderSegmentList() {
    editSegmentList.innerHTML = '';
    if (!workingSegments.length) {
      editSegmentList.innerHTML = `<p class="hint">아직 추가된 박스가 없어요. 아래 버튼으로 텍스트나 이미지를 추가해보세요.</p>`;
      icons();
      return;
    }
    workingSegments.forEach((seg, index) => {
      editSegmentList.appendChild(buildSegmentBox(seg, index));
    });
    icons();
  }

  editSaveBtn.addEventListener('click', async () => {
    const title = editTitleInput.value.trim();
    if (!title) {
      toast('제목을 입력해주세요.');
      editTitleInput.focus();
      return;
    }

    const blockId = currentBlockId;
    const subcategoryId = editSubcategorySelect.value;
    const existing = editingBlockId ? allBlocks.find(b => b.id === editingBlockId) : null;

    editSaveBtn.disabled = true;

    try {
      const segments = workingSegments
        .filter(seg => (seg.type === 'text' ? seg.text.trim() : seg.images.length))
        .map(seg => seg.type === 'text'
          ? { type: 'text', id: seg.id, text: seg.text }
          : { type: 'image', id: seg.id, images: seg.images.map(({ id, url }) => ({ id, url })) });

      const savedImageIds = segments.filter(s => s.type === 'image').flatMap(s => s.images.map(img => img.id));

      const block = {
        id: blockId,
        subcategoryId,
        title,
        segments,
        thumbnailIds: workingThumbnailIds.filter(id => savedImageIds.includes(id)),
        createdAt: existing ? existing.createdAt || Date.now() : Date.now(),
        updatedAt: Date.now()
      };

      await LookbookFirebase.saveBlock(block);

      selection = { categoryId: findCategoryBySub(subcategoryId).id, subcategoryId };
      editingBlockId = null;
      currentBlockId = null;
      workingSegments = [];
      workingThumbnailIds = [];
      editModal.classList.add('hidden');
      toast('저장했어요.');
    } catch (err) {
      console.error(err);
      toast('저장에 실패했어요. 네트워크를 확인해주세요.');
    } finally {
      editSaveBtn.disabled = false;
    }
  });

  // ---------- 모바일 사이드바 ----------
  const sidebar = $('#sidebar');
  const sidebarScrim = $('#sidebarScrim');
  $('#sidebarToggle').addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarScrim.classList.remove('hidden');
  });
  sidebarScrim.addEventListener('click', () => closeMobileSidebar());

  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    sidebarScrim.classList.add('hidden');
  }

  // 키보드로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!editModal.classList.contains('hidden')) closeEditModal();
    else if (!viewModal.classList.contains('hidden')) closeViewModal();
  });

  // ---------- 초기화 (Firebase 로그인 완료 후 시작) ----------
  window.addEventListener('firebase-ready', () => {
    icons();
    LookbookFirebase.subscribeBlocks(blocks => {
      allBlocks = blocks;
      renderSidebar();
      renderMain();
    });
  });
})();
