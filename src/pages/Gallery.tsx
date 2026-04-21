import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, ArrowLeft, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Album = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  event_date: string | null;
};
type Photo = { id: string; photo_url: string; caption: string | null };

const Gallery = () => {
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [active, setActive] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("gallery_albums").select("*").order("event_date", { ascending: false, nullsFirst: false })
      .then(({ data }) => { setAlbums((data as Album[]) ?? []); setLoading(false); });
  }, []);

  const open = async (a: Album) => {
    setActive(a);
    setPhotos([]);
    const { data } = await supabase.from("gallery_photos").select("*")
      .eq("album_id", a.id).order("display_order").order("created_at");
    setPhotos((data as Photo[]) ?? []);
  };

  return (
    <div className="container py-12 md:py-16 max-w-6xl">
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest mb-4">
          <ImageIcon className="h-3 w-3" /> {t("gallery.title")}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">{t("gallery.title")}</h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("gallery.subtitle")}</p>
      </header>

      {loading && <p className="text-center text-muted-foreground py-12">Loading…</p>}

      {!loading && !active && (
        <>
          {albums.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">{t("gallery.empty")}</Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((a) => (
                <button
                  key={a.id}
                  onClick={() => open(a)}
                  className="group text-left rounded-xl overflow-hidden border-2 border-accent/30 bg-card transition-smooth hover:border-primary hover:shadow-warm"
                >
                  <div className="aspect-[4/3] bg-gradient-warm overflow-hidden">
                    {a.cover_url ? (
                      <img src={a.cover_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-accent/50">
                        <ImageIcon className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif text-lg font-semibold text-secondary">{a.title}</h3>
                    {a.event_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(a.event_date).toLocaleDateString()}
                      </p>
                    )}
                    {a.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {active && (
        <div>
          <Button variant="ghost" onClick={() => setActive(null)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("gallery.back")}
          </Button>
          <h2 className="font-serif text-3xl font-bold text-secondary mb-2">{active.title}</h2>
          {active.description && <p className="text-muted-foreground mb-6">{active.description}</p>}

          {photos.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">{t("gallery.emptyPhotos")}</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLightbox(p.photo_url)}
                  className="aspect-square overflow-hidden rounded-lg border border-accent/30 hover:shadow-warm transition-smooth"
                >
                  <img src={p.photo_url} alt={p.caption ?? ""} className="w-full h-full object-cover hover:scale-105 transition-smooth" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-primary-foreground" aria-label="Close">
            <X className="h-8 w-8" />
          </button>
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
};

export default Gallery;
