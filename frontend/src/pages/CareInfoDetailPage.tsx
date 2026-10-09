import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './CareInfoDetailPage.module.css';

interface CareInfoItem {
  id: number;
  content: string;
  pinned: boolean;
  updatedAt: string;
}

const CATEGORY_META: Record<string, { label: string; bg: string; color: string }> = {
  COMMUNICATION: { label: '의사소통', bg: '#e8f5ee', color: '#3CAB7E' },
  PREFERENCE: { label: '선호/비선호', bg: '#fdedf0', color: '#e05555' },
  LIFESTYLE: { label: '생활습관', bg: '#fff3e8', color: '#f57c00' },
  HEALTH_MEDICATION: { label: '건강·복약', bg: '#e8f0fb', color: '#5b8dee' },
  PRECAUTION: { label: '주의사항', bg: '#fff8e1', color: '#f9a825' },
  EMERGENCY: { label: '위기대응', bg: '#fdedf0', color: '#e05555' },
};

const MOCK_DATA: Record<string, CareInfoItem[]> = {
  COMMUNICATION: [
    { id: 1, content: '말로 표현하기 어려울 때 손을 잡거나 물건을 가리키는 방식으로 의사를 표현해요.', pinned: true, updatedAt: '2026.10.08' },
    { id: 2, content: '싫다는 표현은 고개를 세게 흔들거나 자리를 피하는 행동으로 나타나요.', pinned: true, updatedAt: '2026.10.07' },
    { id: 3, content: '원하는 것이 있을 때 해당 물건을 가져오거나 그림을 가리켜요.', pinned: false, updatedAt: '2026.10.05' },
    { id: 4, content: '이름을 불러주면 잘 반응해요. 크게 부르면 놀랄 수 있으니 부드럽게 불러주세요.', pinned: false, updatedAt: '2026.09.30' },
    { id: 5, content: '\"아니오\"라고 말하기 어려워해서 고개를 젓거나 손을 내미는 행동이 거절 표현이에요.', pinned: false, updatedAt: '2026.09.28' },
  ],
  PREFERENCE: [
    { id: 1, content: '음악 듣기와 색연필 그림 그리기를 좋아해요. 동요를 들으면 금방 기분이 좋아져요.', pinned: true, updatedAt: '2026.10.08' },
    { id: 2, content: '큰 소음(폭죽, 공사 소음)이나 갑작스러운 소리에 매우 예민하게 반응해요.', pinned: true, updatedAt: '2026.10.06' },
    { id: 3, content: '외출 시 익숙한 경로와 장소를 선호해요. 새 장소는 사전에 사진으로 미리 보여주세요.', pinned: false, updatedAt: '2026.10.03' },
    { id: 4, content: '파란색 계열 물건을 좋아하고 선호해요. 빨간색은 싫어하는 경향이 있어요.', pinned: false, updatedAt: '2026.09.25' },
    { id: 5, content: '사람이 많은 곳을 힘들어해요. 마트 방문은 이른 오전이나 저녁 늦게가 좋아요.', pinned: false, updatedAt: '2026.09.20' },
  ],
  LIFESTYLE: [
    { id: 1, content: '매일 오전 7시 기상, 오후 10시 취침. 루틴이 바뀌면 불안해할 수 있어요.', pinned: true, updatedAt: '2026.10.07' },
    { id: 2, content: '양치 시 보조가 필요해요. 혼자 하면 잇몸에 상처를 낼 수 있어요.', pinned: true, updatedAt: '2026.10.05' },
    { id: 3, content: '식사 후 약 30분 산책을 즐겨요. 날씨가 좋은 날에는 꼭 나가고 싶어해요.', pinned: false, updatedAt: '2026.10.03' },
    { id: 4, content: '옷 입기는 스스로 할 수 있지만, 단추와 지퍼는 도움이 필요해요.', pinned: false, updatedAt: '2026.09.30' },
    { id: 5, content: '샤워는 15분 이내로 끝내야 해요. 더 길어지면 피부가 건조해지고 가려움을 호소해요.', pinned: false, updatedAt: '2026.09.22' },
  ],
  HEALTH_MEDICATION: [
    { id: 1, content: '리스페리돈 0.5mg — 매일 저녁 식후 30분 복용. 빠뜨리면 다음 날 기분 기복이 심해요.', pinned: true, updatedAt: '2026.10.08' },
    { id: 2, content: '땅콩·호두 등 견과류 알레르기. 접촉만으로도 두드러기 반응. 식품 성분표 꼭 확인해주세요.', pinned: true, updatedAt: '2026.10.07' },
    { id: 3, content: '두통이 있을 때 이마를 자주 만지고 눈을 찡그려요. 조용한 공간에서 쉬게 해주세요.', pinned: false, updatedAt: '2026.10.01' },
    { id: 4, content: '변비 경향이 있어요. 수분과 섬유질 음식(채소, 과일)을 충분히 드실 수 있도록 신경 써주세요.', pinned: false, updatedAt: '2026.09.28' },
  ],
  PRECAUTION: [
    { id: 1, content: '갑자기 손목을 잡으면 큰 소리를 지르거나 공격적 반응을 보일 수 있어요. 접촉 전 반드시 말로 알려주세요.', pinned: true, updatedAt: '2026.10.08' },
    { id: 2, content: '새로운 환경 적응에 시간이 필요해요. 방문 전 사진·동영상으로 미리 설명해주세요.', pinned: true, updatedAt: '2026.10.06' },
    { id: 3, content: '낯선 사람과의 첫 만남을 어려워해요. 처음에는 가까이 다가가기보다 조금 거리를 두세요.', pinned: false, updatedAt: '2026.10.02' },
    { id: 4, content: '무언가를 강요하면 더 강하게 저항해요. 선택지를 두 개 주고 스스로 고르게 해주세요.', pinned: false, updatedAt: '2026.09.25' },
  ],
  EMERGENCY: [
    { id: 1, content: '자해(손 물기, 머리 박기) 시: 부드럽게 이름을 부르고, 좋아하는 동요를 틀어주세요. 강제로 막으면 악화돼요.', pinned: true, updatedAt: '2026.10.08' },
    { id: 2, content: '발작 증상 시: 즉시 119 신고 → 주변 위험물 제거 → 옆으로 눕히기. 강제로 입을 벌리지 마세요.', pinned: true, updatedAt: '2026.10.07' },
    { id: 3, content: '긴급 보호자 연락처: 어머니 김○○ 010-XXXX-XXXX / 아버지 박○○ 010-XXXX-XXXX', pinned: true, updatedAt: '2026.10.01' },
    { id: 4, content: '담당 사회복지사 이○○: 010-XXXX-XXXX (대구장애인복지관 053-XXX-XXXX)', pinned: false, updatedAt: '2026.09.30' },
  ],
};

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M11 2L16 7L11 7L9 13L7 7L2 7L7 2L9 4L11 2Z"
        fill={filled ? '#3CAB7E' : 'none'}
        stroke={filled ? '#3CAB7E' : '#b0bec5'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="9" y1="13" x2="9" y2="16" stroke={filled ? '#3CAB7E' : '#b0bec5'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function CareInfoDetailPage() {
  const { categoryId = '' } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const meta = CATEGORY_META[categoryId];
  const initial = MOCK_DATA[categoryId] ?? [];
  const [items, setItems] = useState<CareInfoItem[]>(initial);

  const togglePin = (id: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, pinned: !item.pinned } : item));
  };

  const pinned = items.filter(i => i.pinned);
  const unpinned = items.filter(i => !i.pinned);

  if (!meta) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/care-info')}
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 19l-7-7 7-7" stroke="#1a2533" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.title}>{meta.label}</h1>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.body}>
        {pinned.length > 0 && (
          <section className={styles.pinnedSection}>
            <p className={styles.sectionLabel}>📌 중요 정보</p>
            <div className={styles.list}>
              {pinned.map(item => (
                <ItemCard key={item.id} item={item} onTogglePin={togglePin} />
              ))}
            </div>
          </section>
        )}

        <section className={styles.allSection}>
          <p className={styles.sectionLabel}>전체 기록 ({items.length})</p>
          <div className={styles.list}>
            {unpinned.map(item => (
              <ItemCard key={item.id} item={item} onTogglePin={togglePin} />
            ))}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.addButton}
          style={{ background: meta.color }}
          onClick={() => navigate('/records/new')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          정보 추가하기
        </button>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  onTogglePin,
}: {
  item: CareInfoItem;
  onTogglePin: (id: number) => void;
}) {
  return (
    <div className={`${styles.card} ${item.pinned ? styles.cardPinned : ''}`}>
      <p className={styles.cardContent}>{item.content}</p>
      <div className={styles.cardMeta}>
        <span className={styles.cardDate}>{item.updatedAt}</span>
        <button
          type="button"
          className={styles.pinButton}
          onClick={() => onTogglePin(item.id)}
          aria-label={item.pinned ? '핀 해제' : '중요 정보로 고정'}
          aria-pressed={item.pinned}
        >
          <PinIcon filled={item.pinned} />
        </button>
      </div>
    </div>
  );
}
