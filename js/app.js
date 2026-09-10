(() => {
  let allBlocks = [];
  let selection = { categoryId: CATEGORIES[0].id, subcategoryId: null }; // subcategoryId null = "전체"
  let editingBlockId = null;
  let workingImages = []; // [{id, dataUrl}]
  let workingThumbnailIds = []; // up to 2 image ids, in order

  const $ = sel => document.querySelector(sel);

  const categoryNav = $('#categoryNav');
  const blockGrid = $('#blockGrid');
  const emptyState = $('#emptyState');
  const breadcrumb = $('#breadcrumb');

  const viewModal = $('#viewModal');
  const viewGallery = $('#viewGallery');
  const viewMeta = $('#viewMeta');
  const viewTitle = $('#viewTitle');
  const viewContent = $('#viewContent');

  const editModal = $('#editModal');
  const editModalTitle = $('#editModalTitle');
  const editCategorySelect = $('#editCategorySelect');
  const editSubcategorySelect = $('#editSubcategorySelect');
  const editTitleInput = $('#editTitleInput');
  const editContentInput = $('#editContentInput');
  const editImageInput = $('#editImageInput');
  const editImageGrid = $('#editImageGrid');

  function icons() {
    if (window.lucide) lucide.createIcons();
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
        <span class="cat-icons">
          <i data-lucide="${cat.icons[0]}"></i><i data-lucide="${cat.icons[1]}"></i>
        </span>
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
    const thumbs = (block.thumbnailIds || [])
      .map(id => block.images.find(img => img.id === id))
      .filter(Boolean);
    const source = thumbs.length ? thumbs : (block.images.length ? [block.images[0]] : []);

    if (!source.length) {
      return `<div class="thumb-empty"><i data-lucide="image"></i></div>`;
    }
    return source.map(img => `<div class="thumb-half"><img src="${img.dataUrl}" alt=""></div>`).join('');
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
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-thumb thumb-count-${(block.thumbnailIds && block.thumbnailIds.length) || (block.images.length ? 1 : 0)}">
          ${thumbnailHTML(block)}
        </div>
        <div class="card-title">${escapeHTML(block.title || '(제목 없음)')}</div>
      `;
      card.addEventListener('click', () => openViewModal(block.id));
      blockGrid.appendChild(card);
    });
    icons();
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderMain() {
    renderBreadcrumb();
    renderGrid();
  }

  // ---------- 상세 보기 모달 ----------
  function openViewModal(blockId) {
    const block = allBlocks.find(b => b.id === blockId);
    if (!block) return;
    viewModal.dataset.blockId = blockId;

    viewGallery.innerHTML = block.images.length
      ? block.images.map(img => `<img src="${img.dataUrl}" alt="">`).join('')
      : `<div class="thumb-empty large"><i data-lucide="image"></i></div>`;

    const sub = findSub(block.subcategoryId);
    const cat = findCategoryBySub(block.subcategoryId);
    viewMeta.textContent = cat ? `${cat.name} · ${sub.name}` : '';
    viewTitle.textContent = block.title || '(제목 없음)';
    viewContent.textContent = block.content || '';

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
    if (!confirm('이 카드를 삭제할까요? 되돌릴 수 없어요.')) return;
    await DB.delete(id);
    allBlocks = allBlocks.filter(b => b.id !== id);
    closeViewModal();
    renderSidebar();
    renderMain();
    toast('카드를 삭제했어요.');
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

    editModalTitle.textContent = block ? '카드 수정' : '새 카드 추가';
    editTitleInput.value = block ? block.title || '' : '';
    editContentInput.value = block ? block.content || '' : '';
    workingImages = block ? block.images.map(img => ({ ...img })) : [];
    workingThumbnailIds = block ? [...(block.thumbnailIds || [])] : [];

    const defaultCat = block ? findCategoryBySub(block.subcategoryId).id : (selection.categoryId || CATEGORIES[0].id);
    const defaultSub = block ? block.subcategoryId : (selection.subcategoryId || CATEGORIES.find(c => c.id === defaultCat).subs[0].id);
    populateCategorySelects(defaultCat, defaultSub);

    renderImageManageGrid();
    editImageInput.value = '';
    editModal.classList.remove('hidden');
    icons();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editingBlockId = null;
    workingImages = [];
    workingThumbnailIds = [];
  }

  $('[data-close-edit]').addEventListener('click', closeEditModal);
  $('#editCancelBtn').addEventListener('click', closeEditModal);
  editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

  $('#addBlockBtn').addEventListener('click', () => openEditModal(null));
  $('#emptyAddBtn').addEventListener('click', () => openEditModal(null));

  editImageInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const dataUrl = await fileToDataURL(file);
      workingImages.push({ id: uid(), dataUrl });
    }
    editImageInput.value = '';
    renderImageManageGrid();
  });

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderImageManageGrid() {
    editImageGrid.innerHTML = '';
    if (!workingImages.length) {
      editImageGrid.innerHTML = `<p class="hint">아직 추가된 이미지가 없어요.</p>`;
      return;
    }
    workingImages.forEach(img => {
      const thumbIndex = workingThumbnailIds.indexOf(img.id);
      const cell = document.createElement('div');
      cell.className = 'image-manage-cell' + (thumbIndex > -1 ? ' selected' : '');
      cell.innerHTML = `
        <img src="${img.dataUrl}" alt="">
        <button type="button" class="image-remove" title="이미지 삭제"><i data-lucide="x"></i></button>
        <button type="button" class="image-thumb-toggle" title="썸네일로 선택">
          ${thumbIndex > -1 ? `<span class="thumb-badge">${thumbIndex + 1}</span>` : `<i data-lucide="star"></i>`}
        </button>
      `;
      cell.querySelector('.image-remove').addEventListener('click', () => {
        workingImages = workingImages.filter(i => i.id !== img.id);
        workingThumbnailIds = workingThumbnailIds.filter(id => id !== img.id);
        renderImageManageGrid();
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
        renderImageManageGrid();
      });
      editImageGrid.appendChild(cell);
    });
    icons();
  }

  $('#editSaveBtn').addEventListener('click', async () => {
    const title = editTitleInput.value.trim();
    if (!title) {
      toast('제목을 입력해주세요.');
      editTitleInput.focus();
      return;
    }
    const subcategoryId = editSubcategorySelect.value;
    const block = {
      id: editingBlockId || uid(),
      subcategoryId,
      title,
      content: editContentInput.value,
      images: workingImages,
      thumbnailIds: workingThumbnailIds,
      updatedAt: Date.now(),
      createdAt: editingBlockId
        ? (allBlocks.find(b => b.id === editingBlockId)?.createdAt || Date.now())
        : Date.now()
    };

    await DB.put(block);
    const idx = allBlocks.findIndex(b => b.id === block.id);
    if (idx > -1) allBlocks[idx] = block; else allBlocks.push(block);

    selection = { categoryId: findCategoryBySub(subcategoryId).id, subcategoryId };
    closeEditModal();
    renderSidebar();
    renderMain();
    toast('저장했어요.');
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

  // ---------- 초기화 ----------
  async function init() {
    icons();
    allBlocks = await DB.getAll();
    renderSidebar();
    renderMain();
  }

  init();
})();
