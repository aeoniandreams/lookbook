(() => {
  let allBlocks = [];
  let selection = { categoryId: CATEGORIES[0].id, subcategoryId: null }; // subcategoryId null = "전체"
  let editingBlockId = null;
  let currentBlockId = null;
  let workingImages = []; // [{id, url}]
  let workingThumbnailIds = []; // 최대 2개, 선택 순서 유지
  let workingSameRow = []; // workingImages와 같은 길이. true면 바로 앞 이미지와 한 줄로 묶임

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
  const editImageUrlInput = $('#editImageUrlInput');
  const editImageUrlAddBtn = $('#editImageUrlAddBtn');
  const editImageGrid = $('#editImageGrid');
  const editSaveBtn = $('#editSaveBtn');

  function icons() {
    if (window.lucide) lucide.createIcons();
  }

  // lucide에 없는 아이콘을 직접 그려서 채워넣은 것 (lucide와 같은 24x24 스트로크 스타일)
  const CUSTOM_ICONS = {
    butterfly: `<path d="M12 8c0-3.5-2.5-6-5.5-6C4 2 2 4 2 6.5 2 9.5 4.5 12 8 13c-3.5 1-6 3.5-6 6.5C2 22 4 22 6.5 22 9.5 22 12 19.5 12 16"/><path d="M12 8c0-3.5 2.5-6 5.5-6C20 2 22 4 22 6.5c0 3-2.5 5.5-6 6.5 3.5 1 6 3.5 6 6.5 0 2.5-2 2.5-4.5 2.5-3 0-5.5-2.5-5.5-5.5"/><path d="M12 8v8"/>`,
    basketball: `<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M9 3.5Q12 12 9 20.5"/><path d="M15 3.5Q12 12 15 20.5"/>`
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

  // 이미지 묶음 레이아웃: imageLayout은 [한 줄에 들어갈 이미지 개수, ...] 형태로 저장한다.
  // (예: [1,2,1] = 1번째 이미지 혼자, 2~3번째 이미지 한 줄, 4번째 이미지 혼자)
  // 편집 화면에서는 다루기 쉽게 "바로 앞 이미지와 같은 줄인지" boolean 배열로 변환해서 쓴다.
  function layoutToSameRowFlags(images, layout) {
    const flags = images.map(() => false);
    if (!layout || !layout.length) return flags;
    let idx = 0;
    layout.forEach(size => {
      for (let j = 0; j < size && idx < flags.length; j++, idx++) {
        if (j > 0) flags[idx] = true;
      }
    });
    return flags;
  }

  function sameRowFlagsToLayout(flags) {
    const layout = [];
    flags.forEach((sameAsPrev, i) => {
      if (i === 0 || !sameAsPrev) layout.push(1);
      else layout[layout.length - 1]++;
    });
    return layout;
  }

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
    const images = block.images || [];
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
      const thumbCount = (block.thumbnailIds && block.thumbnailIds.length) || ((block.images || []).length ? 1 : 0);
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

    const images = block.images || [];
    if (!images.length) {
      viewGallery.innerHTML = `<div class="thumb-empty large"><i data-lucide="image"></i></div>`;
    } else {
      const rows = buildGalleryRows(images, block.imageLayout);
      viewGallery.innerHTML = rows.map(row => {
        const cls = row.length > 1 ? 'gallery-row multi' : 'gallery-row single';
        return `<div class="${cls}">${row.map(img => `<img src="${img.url}" alt="" loading="lazy">`).join('')}</div>`;
      }).join('');
    }

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
    editContentInput.value = block ? block.content || '' : '';
    workingImages = block
      ? (block.images || []).map(img => ({ id: img.id, url: img.url }))
      : [];
    workingThumbnailIds = block ? [...(block.thumbnailIds || [])] : [];
    workingSameRow = block ? layoutToSameRowFlags(workingImages, block.imageLayout) : [];

    const defaultCat = block ? findCategoryBySub(block.subcategoryId).id : (selection.categoryId || CATEGORIES[0].id);
    const defaultSub = block ? block.subcategoryId : (selection.subcategoryId || CATEGORIES.find(c => c.id === defaultCat).subs[0].id);
    populateCategorySelects(defaultCat, defaultSub);

    renderImageManageGrid();
    editImageUrlInput.value = '';
    editModal.classList.remove('hidden');
    icons();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editingBlockId = null;
    currentBlockId = null;
    workingImages = [];
    workingThumbnailIds = [];
    workingSameRow = [];
  }

  $('[data-close-edit]').addEventListener('click', closeEditModal);
  $('#editCancelBtn').addEventListener('click', closeEditModal);
  editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

  $('#addBlockBtn').addEventListener('click', () => openEditModal(null));
  $('#emptyAddBtn').addEventListener('click', () => openEditModal(null));

  function addImageUrl() {
    const url = editImageUrlInput.value.trim();
    if (!url) return;
    workingImages.push({ id: uid(), url });
    workingSameRow.push(false);
    editImageUrlInput.value = '';
    renderImageManageGrid();
    editImageUrlInput.focus();
  }

  editImageUrlAddBtn.addEventListener('click', addImageUrl);
  editImageUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addImageUrl();
    }
  });

  function buildImageCell(img, index) {
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
      const i = workingImages.findIndex(im => im.id === img.id);
      if (i > -1) {
        workingImages.splice(i, 1);
        workingSameRow.splice(i, 1);
      }
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
    return cell;
  }

  function buildRowLinkBtn(linked, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'row-link-btn' + (linked ? ' linked' : '');
    btn.title = linked ? '분리하기' : '이 이미지와 나란히 배치하기';
    btn.innerHTML = `<i data-lucide="${linked ? 'link-2' : 'link'}"></i>`;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderImageManageGrid() {
    editImageGrid.innerHTML = '';
    if (!workingImages.length) {
      editImageGrid.innerHTML = `<p class="hint">아직 추가된 이미지가 없어요.</p>`;
      return;
    }
    workingImages.forEach((img, i) => {
      if (i > 0) {
        if (workingSameRow[i]) {
          editImageGrid.appendChild(buildRowLinkBtn(true, () => {
            workingSameRow[i] = false;
            renderImageManageGrid();
          }));
        } else {
          const rowBreak = document.createElement('div');
          rowBreak.className = 'row-break';
          editImageGrid.appendChild(rowBreak);
          editImageGrid.appendChild(buildRowLinkBtn(false, () => {
            workingSameRow[i] = true;
            renderImageManageGrid();
          }));
        }
      }
      editImageGrid.appendChild(buildImageCell(img, i));
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
      const images = workingImages.map(({ id, url }) => ({ id, url }));
      const block = {
        id: blockId,
        subcategoryId,
        title,
        content: editContentInput.value,
        images,
        imageLayout: sameRowFlagsToLayout(workingSameRow),
        thumbnailIds: workingThumbnailIds.filter(id => images.some(img => img.id === id)),
        createdAt: existing ? existing.createdAt || Date.now() : Date.now(),
        updatedAt: Date.now()
      };

      await LookbookFirebase.saveBlock(block);

      selection = { categoryId: findCategoryBySub(subcategoryId).id, subcategoryId };
      editingBlockId = null;
      currentBlockId = null;
      workingImages = [];
      workingThumbnailIds = [];
      workingSameRow = [];
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
