import { redirect } from 'next/navigation';

export default function Home() {
  // トップページにアクセスしたら作成ページにリダイレクト
  redirect('/create');
}
