import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Movie {
  id: string;
  title: string;
  description: string | null;
  trailer_url: string;
  poster_url: string | null;
  active: boolean;
  category: "latest" | "upcoming" | "trending";
}

export function MoviesTab() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("movies").select("*").order("created_at", { ascending: false });
    setMovies((data ?? []) as Movie[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (m: Movie) => {
    const { error } = await supabase.from("movies").update({ active: !m.active }).eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success(m.active ? "Deactivated" : "Activated"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this movie permanently?")) return;
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{movies.length} movies · {movies.filter(m => m.active).length} active</p>
        <MovieDialog onSaved={load} />
      </div>
      <div className="rounded-xl border border-border bg-gradient-card overflow-x-auto shadow-card-elegant">
        <table className="w-full text-sm">
          <thead className="bg-card/50 border-b border-border">
            <tr className="text-left">
              <th className="p-3">Movie</th>
              <th className="p-3">Category</th>
              <th className="p-3">Trailer URL</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {movies.map(m => (
              <tr key={m.id} className="border-b border-border/40 hover:bg-card/40">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {m.poster_url ? (
                      <img src={m.poster_url} alt={m.title} className="w-10 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-14 rounded bg-muted flex items-center justify-center"><Film className="h-4 w-4" /></div>
                    )}
                    <div>
                      <div className="font-medium">{m.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{m.description || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3"><Badge variant="outline" className="capitalize">{m.category}</Badge></td>
                <td className="p-3 text-xs font-mono break-all max-w-[240px]">{m.trailer_url}</td>
                <td className="p-3">
                  <Badge variant={m.active ? "default" : "outline"} className={m.active ? "bg-success text-success-foreground" : ""}>
                    {m.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <MovieDialog movie={m} onSaved={load} />
                    <Button size="sm" variant="outline" onClick={() => toggleActive(m)}>
                      {m.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(m.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MovieDialog({ movie, onSaved }: { movie?: Movie; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(movie?.title ?? "");
  const [description, setDescription] = useState(movie?.description ?? "");
  const [trailerUrl, setTrailerUrl] = useState(movie?.trailer_url ?? "");
  const [posterUrl, setPosterUrl] = useState(movie?.poster_url ?? "");
  const [category, setCategory] = useState<"latest" | "upcoming" | "trending">(movie?.category ?? "latest");
  const [busy, setBusy] = useState(false);

  const normalizeYoutube = (url: string) => {
    // Convert common YouTube URL forms to embed format
    const m1 = url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/);
    if (m1) return `https://www.youtube.com/embed/${m1[1]}`;
    const m2 = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (m2) return `https://www.youtube.com/embed/${m2[1]}`;
    return url;
  };

  const save = async () => {
    if (!title.trim() || !trailerUrl.trim()) { toast.error("Title and trailer URL are required"); return; }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        trailer_url: normalizeYoutube(trailerUrl.trim()),
        poster_url: posterUrl.trim() || null,
        category,
      };
      const { error } = movie
        ? await supabase.from("movies").update(payload).eq("id", movie.id)
        : await supabase.from("movies").insert({ ...payload, active: true });
      if (error) throw error;
      toast.success(movie ? "Movie updated" : "Movie added");
      setOpen(false); onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {movie
          ? <Button size="sm" variant="outline"><Pencil className="h-3 w-3" /></Button>
          : <Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2" />Add Movie</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{movie ? "Edit Movie" : "Add New Movie"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Inception" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Short synopsis..." /></div>
          <div>
            <Label>Trailer URL *</Label>
            <Input value={trailerUrl} onChange={e => setTrailerUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            <p className="text-xs text-muted-foreground mt-1">YouTube watch/short URLs are auto-converted to embed format.</p>
          </div>
          <div><Label>Poster URL</Label><Input value={posterUrl} onChange={e => setPosterUrl(e.target.value)} placeholder="https://image.tmdb.org/..." /></div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest Releases</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy} className="bg-gradient-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (movie ? "Save Changes" : "Add Movie")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
