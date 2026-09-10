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
    butterfly: `<path d="M12 11Q18.11 9.91 20 4Q13.89 5.09 12 11"/><path d="M12 13Q12.71 17.78 17 20Q16.29 15.22 12 13"/><path d="M12 11Q5.89 9.91 4 4Q10.11 5.09 12 11"/><path d="M12 13Q11.29 17.78 7 20Q7.71 15.22 12 13"/>`,
    basketball: `<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M7.5 3.5Q12 12 7.5 20.5"/><path d="M16.5 3.5Q12 12 16.5 20.5"/>`
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
    if (selection.subcategoryId) {
      return allBlocks.filter(b => b.subcategoryId === selection.subcategoryId);
    }
    const subIds = cat.subs.map(s => s.id);
    return allBlocks.filter(b => subIds.includes(b.subcategoryId));
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
      return `<p class="view-text-block">${escapeHTML(seg.text || '')}</p>`;
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
  viewModal.addEventListener('click', e => { if (e.target === viewModal) closeViewModal(); });

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
  editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

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
  sidebarScrim.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarScrim.classList.add('hidden');
  });

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
