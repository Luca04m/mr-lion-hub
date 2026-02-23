import { useState, useEffect } from "react";
import { getMeetings, createMeeting, deleteMeeting, getUser } from "@/lib/store";
import { Meeting, FileType, FILE_TYPE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, FileText, Calendar, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const FILE_TYPE_COLORS: Record<FileType, string> = {
  pauta: "#3B82F6",
  resumo: "#22C55E",
  ata: "#F59E0B",
  outro: "#6B7280",
};

const MeetingsPage = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const userName = getUser() || "";

  const reload = () => setMeetings(getMeetings());
  useEffect(() => { reload(); }, []);

  const handleCreate = (data: Omit<Meeting, "id" | "createdAt">) => {
    createMeeting(data);
    toast.success("Reunião criada");
    setDialogOpen(false);
    reload();
  };

  const handleDelete = (id: number) => {
    deleteMeeting(id);
    toast.success("Reunião excluída");
    reload();
  };

  // Find upcoming meeting
  const upcoming = meetings.find(m => new Date(m.meetingDate) >= new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Reuniões</h1>
        <Button onClick={() => setDialogOpen(true)} className="gradient-gold text-primary-foreground font-semibold glow-pulse" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nova Reunião
        </Button>
      </div>

      {/* Upcoming meeting */}
      {upcoming && (
        <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gold" />
            <span className="text-xs text-gold font-medium">Próxima Reunião</span>
          </div>
          <h3 className="font-semibold">{upcoming.title}</h3>
          <p className="text-sm text-muted-foreground font-mono">{format(new Date(upcoming.meetingDate), "dd/MM/yyyy", { locale: ptBR })}</p>
        </div>
      )}

      {/* Meetings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {meetings.map(m => (
          <div key={m.id} className="bg-card rounded-lg border border-border p-4 hover:border-gold/20 transition-all">
            <div className="flex items-start justify-between mb-2">
              <span className="text-lg font-bold font-mono text-gold">{format(new Date(m.meetingDate), "dd/MM", { locale: ptBR })}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${FILE_TYPE_COLORS[m.fileType]}15`, color: FILE_TYPE_COLORS[m.fileType] }}>
                {FILE_TYPE_LABELS[m.fileType]}
              </span>
            </div>
            <h3 className="text-sm font-semibold mb-1">{m.title}</h3>
            {m.notes && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{m.notes}</p>}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-muted-foreground">por {m.uploadedBy}</span>
              <div className="flex gap-1">
                {m.fileUrl && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => window.open(m.fileUrl, "_blank")}>
                    <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">Nenhuma reunião registrada</div>
        )}
      </div>

      <MeetingDialog open={dialogOpen} onOpenChange={setDialogOpen} userName={userName} onSave={handleCreate} />
    </div>
  );
};

function MeetingDialog({ open, onOpenChange, userName, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void; userName: string;
  onSave: (data: Omit<Meeting, "id" | "createdAt">) => void;
}) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [fileType, setFileType] = useState<FileType>("pauta");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) { setTitle(""); setMeetingDate(""); setFileType("pauta"); setNotes(""); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader><DialogTitle className="text-gold">Nova Reunião</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary/40" />
          <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="bg-secondary/40" />
          <Select value={fileType} onValueChange={v => setFileType(v as FileType)}>
            <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(f => (
                <SelectItem key={f} value={f}>{FILE_TYPE_LABELS[f]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Notas da reunião" value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary/40" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={!title.trim() || !meetingDate}
              onClick={() => onSave({ title, meetingDate, fileType, fileName: "", fileUrl: "", uploadedBy: userName, notes })}
              className="gradient-gold text-primary-foreground font-semibold">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MeetingsPage;
