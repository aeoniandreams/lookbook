// 1차/2차 카테고리 정의. id는 고정 문자열로, 나중에 카테고리 이름이 바뀌어도
// 저장된 카드와의 연결이 끊어지지 않도록 한다.
const CATEGORIES = [
  {
    id: 'jung-yun',
    name: '中ゆん',
    icon: 'ferris-wheel',
    subs: [
      { id: 'jung-yun-jakjung', name: '작중' },
      { id: 'jung-yun-planning', name: '기획 일러스트' },
      { id: 'jung-yun-bunmayo', name: '분마요' }
    ]
  },
  {
    id: 'hyun-gaeul',
    name: '현가을',
    icon: 'mail',
    subs: [
      { id: 'hyun-gaeul-jakjung', name: '작중' },
      { id: 'hyun-gaeul-illust', name: '일러스트' }
    ]
  },
  {
    id: 'yeongseok',
    name: '影夕',
    icon: 'volleyball',
    subs: [
      { id: 'yeongseok-jakjung', name: '작중' },
      { id: 'yeongseok-illust', name: '일러스트' },
      { id: 'yeongseok-special', name: 'Special' }
    ]
  },
  {
    id: 'ghimer',
    name: 'GhiMer',
    icon: 'butterfly', // lucide에 없어서 직접 그린 커스텀 아이콘 (app.js의 CUSTOM_ICONS 참고)
    subs: [
      { id: 'ghimer-part1', name: '전편' },
      { id: 'ghimer-part2', name: '후편' },
      { id: 'ghimer-epilogue', name: '에필로그' }
    ]
  },
  {
    id: 'sirene',
    name: 'Sirené',
    icon: 'star',
    subs: [
      { id: 'sirene-main', name: '메인 스토리' },
      { id: 'sirene-event', name: '이벤트' },
      { id: 'sirene-special', name: 'Special' }
    ]
  },
  {
    id: 'samryeon',
    name: '三蓮 / 대만하리',
    icon: 'basketball', // lucide에 없어서 직접 그린 커스텀 아이콘 (app.js의 CUSTOM_ICONS 참고)
    subs: [
      { id: 'samryeon-jakjung', name: '작중' },
      { id: 'samryeon-special', name: 'Special' }
    ]
  }
];

function findCategoryBySub(subId) {
  return CATEGORIES.find(cat => cat.subs.some(s => s.id === subId));
}

function findSub(subId) {
  const cat = findCategoryBySub(subId);
  if (!cat) return null;
  return cat.subs.find(s => s.id === subId);
}
