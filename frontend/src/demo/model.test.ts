import { describe, expect, it } from 'vitest';
import { createDemo, transition, canAccess, today, readDemo } from './model';

describe('돌봄 데모 상태', () => {
  it('기록을 저장하고 직렬화 후 복원한다', () => {
    const s = transition(createDemo(), {
      type: 'record',
      content: '새 기록',
      category: 'COMMUNICATION',
    });
    expect(readDemo(JSON.stringify(s)).records[0].content).toBe('새 기록');
  });
  it('공백 기록은 거부한다', () => {
    expect(() =>
      transition(createDemo(), {
        type: 'record',
        content: ' ',
        category: 'COMMUNICATION',
      }),
    ).toThrow();
  });
  it('제안은 승인 전 원본을 바꾸지 않고, 보호자만 승인한다', () => {
    let s = createDemo();
    const original = s.records[0].content;
    s.role = 'provider';
    s = transition(s, {
      type: 'suggest',
      recordId: 'r1',
      content: '변경 제안',
    });
    expect(s.records[0].content).toBe(original);
    expect(() =>
      transition(s, { type: 'review', id: s.suggestions[0].id, approve: true }),
    ).toThrow();
    s.role = 'guardian';
    s = transition(s, {
      type: 'review',
      id: s.suggestions[0].id,
      approve: true,
    });
    expect(s.records[0].content).toBe('변경 제안');
    expect(() =>
      transition(s, { type: 'review', id: s.suggestions[0].id, approve: true }),
    ).toThrow();
  });
  it('거절하면 원본을 유지한다', () => {
    let s = createDemo();
    const text = s.records[0].content;
    s.role = 'provider';
    s = transition(s, {
      type: 'suggest',
      recordId: 'r1',
      content: '거절할 제안',
    });
    s.role = 'guardian';
    s = transition(s, {
      type: 'review',
      id: s.suggestions[0].id,
      approve: false,
    });
    expect(s.records[0].content).toBe(text);
  });
  it('종료 후 제공자의 읽기·쓰기를 막고 재배정하면 복구한다', () => {
    let s = createDemo();
    s.role = 'agency';
    s = transition(s, { type: 'end', id: 'a1' });
    s.role = 'provider';
    expect(canAccess(s, 'p1')).toBe(false);
    expect(() =>
      transition(s, {
        type: 'record',
        content: '접근 불가',
        category: 'COMMUNICATION',
      }),
    ).toThrow();
    s.role = 'agency';
    s = transition(s, {
      type: 'assign',
      recipientId: 'p1',
      providerId: 's1',
      start: today(),
      end: '',
    });
    s.role = 'provider';
    expect(canAccess(s, 'p1')).toBe(true);
  });
  it('잘못된 배정 기간을 거부한다', () => {
    const s = createDemo();
    s.role = 'agency';
    expect(() =>
      transition(s, {
        type: 'assign',
        recipientId: 'p1',
        providerId: 's1',
        start: '2026-10-10',
        end: '2026-10-09',
      }),
    ).toThrow();
  });
  it('다른 작성자의 기록을 직접 수정할 수 없다', () => {
    const s = createDemo();
    s.role = 'provider';
    expect(() =>
      transition(s, {
        type: 'record',
        id: 'r1',
        content: '무단 수정',
        category: 'COMMUNICATION',
      }),
    ).toThrow();
  });
  it('손상된 저장값은 예시 데이터로 복구한다', () => {
    expect(readDemo('invalid').version).toBe(1);
    expect(readDemo('{"version":1}').records.length).toBeGreaterThan(0);
  });
});
