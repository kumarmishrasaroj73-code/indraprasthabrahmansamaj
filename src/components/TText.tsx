import { useAutoTranslate } from "@/hooks/useAutoTranslate";

interface TTextProps {
  children: string | null | undefined;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

/**
 * Renders a dynamic (DB-fetched) string and auto-translates it to the
 * currently-selected language via the `translate` edge function.
 * Falls back to the original (English) text while translation is in flight
 * or if the AI call fails.
 */
export const TText = ({ children, as: Tag = "span", className }: TTextProps) => {
  const translated = useAutoTranslate(children ?? "");
  const Component = Tag as any;
  return <Component className={className}>{translated}</Component>;
};
