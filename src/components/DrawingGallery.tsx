import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Download, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { playPopSound } from '@/utils/soundEffects';
import { getDrawings, deleteDrawing, getDrawingRecoveryWarning, getLegacyDrawingBackup, type SavedDrawing } from '@/utils/drawingStore';
import { useDialogFocus } from '@/hooks/useDialogFocus';

interface DrawingPreview extends SavedDrawing { dataUrl: string; thumbnailUrl: string }

interface DrawingGalleryProps {
  onClose: () => void;
}

function DrawingLightbox({ drawing, confirming, onClose, onDownload, onDelete }: {
  drawing: DrawingPreview; confirming: boolean; onClose: () => void; onDownload: () => void; onDelete: () => void;
}) {
  const ref = useDialogFocus(onClose);
  return createPortal(<div className="fixed inset-0 z-[60] bg-black/90 grid place-items-center p-5" onClick={(event) => { event.stopPropagation(); onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Çizim önizlemesi" tabIndex={-1} className="relative max-w-full space-y-4" onClick={(event) => event.stopPropagation()}>
      <button onClick={onClose} aria-label="Önizlemeyi kapat" className="absolute top-2 right-2 min-w-11 min-h-11 bg-black/70 text-white rounded-full">✕</button>
      <img src={drawing.dataUrl} alt={drawing.name} className="max-w-full max-h-[70vh] rounded-2xl" />
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={onDownload} className="px-5 py-3 bg-primary text-white rounded-xl font-bold">İndir</button>
        <button onClick={onDelete} className="px-5 py-3 bg-destructive text-white rounded-xl font-bold">{confirming ? 'Silmeyi onayla' : 'Sil'}</button>
      </div>
    </div>
  </div>, document.body);
}

export default function DrawingGallery({ onClose }: DrawingGalleryProps) {
  const [drawings, setDrawings] = useState<DrawingPreview[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingPreview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recoveryWarning, setRecoveryWarning] = useState('');
  const [revision, setRevision] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const dialogRef = useDialogFocus(onClose);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setLoading(true);
    setError('');
    void getDrawings().then((items) => {
      if (cancelled) return;
      setRecoveryWarning(getDrawingRecoveryWarning());
      setDrawings(items.map((drawing) => {
        const dataUrl = URL.createObjectURL(drawing.blob);
        const thumbnailUrl = URL.createObjectURL(drawing.thumbnail);
        urls.push(dataUrl, thumbnailUrl);
        return { ...drawing, dataUrl, thumbnailUrl };
      }));
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Galeri açılamadı.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [revision]);

  const handleDelete = async (id: string) => {
    if (deleteId !== id) { setDeleteId(id); return; }
    try {
      await deleteDrawing(id);
      playPopSound();
      setSelectedDrawing(null);
      setDeleteId(null);
      setRevision((value) => value + 1);
    } catch { toast.error('Çizim silinemedi. Tekrar deneyebilirsin.'); }
  };

  const handleDownload = (drawing: DrawingPreview) => {
    const link = document.createElement('a');
    link.download = drawing.name + (drawing.blob.type === 'image/webp' ? '.webp' : drawing.blob.type === 'image/jpeg' ? '.jpg' : '.png');
    link.href = drawing.dataUrl;
    link.click();
  };

  const downloadRecovery = () => {
    const raw = getLegacyDrawingBackup();
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const link = document.createElement('a');
    link.download = 'oyuncak-eski-cizimler-yedek.json';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Çizim Galerim"
        tabIndex={-1}
        className="bg-card rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
            <Image className="w-8 h-8 text-primary" aria-hidden="true" />
            Çizim Galerim
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Galeriyi kapat"
            className="p-2 rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {recoveryWarning && <div role="status" className="mb-4 rounded-xl border border-amber-400/40 p-4 text-sm">
            <p>{recoveryWarning}</p>
            <button onClick={downloadRecovery} className="mt-2 min-h-11 rounded-lg border border-border px-3">Eski kayıtların yedeğini indir</button>
          </div>}
          {loading ? <p role="status">Galeri yükleniyor…</p> : error ? <div role="alert"><p>{error}</p><button className="mt-3 rounded-xl border border-border px-4 py-3" onClick={() => setRevision((value) => value + 1)}>Tekrar dene</button></div> : drawings.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">🎨</span>
              <p className="text-xl font-bold text-muted-foreground mt-4">
                Henüz çizim yok!
              </p>
              <p className="text-muted-foreground">
                Çizim yaptığında buraya kaydedebilirsin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {drawings.map((drawing) => (
                <div
                  key={drawing.id}
                  className="relative group transition-transform hover:scale-105"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDrawing(drawing)}
                    aria-label={`${drawing.name} çizimini aç`}
                    className="w-full aspect-square rounded-2xl overflow-hidden bg-white border-4 border-transparent hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <img
                      src={drawing.thumbnailUrl}
                      alt={drawing.name}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-100 focus-within:opacity-100 transition-opacity">
                    <span className="text-xs font-bold bg-black/50 text-white px-2 py-1 rounded-full truncate max-w-[60%]">
                      {drawing.name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownload(drawing); }}
                        aria-label={`${drawing.name} çizimini indir`}
                        className="min-w-11 min-h-11 grid place-items-center p-2 bg-primary text-white rounded-full hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleDelete(drawing.id); }}
                        aria-label={deleteId === drawing.id ? `${drawing.name} silmeyi onayla` : `${drawing.name} çizimini sil`}
                        className="min-w-11 min-h-11 grid place-items-center p-2 bg-destructive text-white rounded-full hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        {deleteId === drawing.id ? <span className="text-xs">Onayla</span> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox */}
        {selectedDrawing && <DrawingLightbox drawing={selectedDrawing} confirming={deleteId === selectedDrawing.id}
          onClose={() => setSelectedDrawing(null)} onDownload={() => handleDownload(selectedDrawing)} onDelete={() => void handleDelete(selectedDrawing.id)} />}

      </div>
    </div>
  );
}


