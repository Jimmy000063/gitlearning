import { notFound } from "next/navigation";
import { ALL_LESSONS, getLesson } from "@/content";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";

export function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ lessonId: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const l = getLesson(lessonId);
  return { title: l ? `${l.title} · Git Galaxy` : "Git Galaxy" };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (!getLesson(lessonId)) notFound();
  return <LessonPlayer key={lessonId} id={lessonId} />;
}
