// Supabase データベースの型定義

export interface Event {
  id: string;
  title: string;
  description: string | null;
  duration: number; // 会議時間（分）
  creator_token: string;
  created_at: string;
}

export interface Option {
  id: string;
  event_id: string;
  date: string; // 日付 (YYYY-MM-DD)
  start_time: string; // 開始時刻 (HH:MM)
  end_time: string; // 終了時刻 (HH:MM)
  created_at: string;
}

export interface Response {
  id: string;
  option_id: string;
  user_name: string;
  selected_slots: string[]; // 選択した時間スロット ["10:00", "10:30", ...]
  created_at: string;
}

// フロントエンド用の拡張型
export interface OptionWithResponses extends Option {
  responses: Response[];
}

export interface EventWithOptions extends Event {
  options: OptionWithResponses[];
}

// 時間スロットを生成するユーティリティ
// 注: 終了時刻は「この時間帯まで選択可能」という意味で使用
export function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;

  // 終了時刻まで30分刻みでスロットを生成
  // 例: 10:00-21:00の場合、10:00〜20:30までのスロットを生成
  for (let min = startTotalMin; min < endTotalMin; min += 30) {
    const hour = Math.floor(min / 60);
    const minute = min % 60;
    slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  return slots;
}

// 時間スロットから終了時刻を計算
export function getSlotEndTime(startSlot: string, durationMinutes: number): string {
  const [hour, min] = startSlot.split(':').map(Number);
  const endTotalMin = hour * 60 + min + durationMinutes;
  const endHour = Math.floor(endTotalMin / 60);
  const endMin = endTotalMin % 60;
  return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
}
