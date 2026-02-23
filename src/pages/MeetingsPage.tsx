import { useState, useEffect } from "react";
import { getMeetings, createMeeting, updateMeeting, deleteMeeting, getUser } from "@/lib/store";
import { Meeting, FileType, FILE_TYPE_LABELS, MeetingTipo, MeetingStatus, MEETING_TIPO_COLORS, MEETING_STATUS_COLORS, TEAM_MEMBERS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Calendar, Pencil, MapPin, Video, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const TIPOS: MeetingTipo[] = ["Recorrente", "Mensal", "Pontual"];
const STATUSES: MeetingStatus[] = ["Agendada", "Realizada", "Cancelada"];

const MeetingsPage = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const userName = getUser() || "";

  const reload = () => setMeetings(getMeetings());
  useEffect(() => { reload(); }, []);

  const handleCreate = (data: Omit<Meeting, "id" | "createdAt">) => {
    createMeeting(data);
    toast.success("Reunião criada");
    setDialogOpen(false);
    reload();
  };

  const handleUpdate = (data: Omit<Meeting, "id" | "createdAt">) => {
    if (!editMeeting) return;
    updateMeeting(editMeeting.id, data);
    toast.success("Reunião atualizada");
    setEditMeeting(null);
    reload();
  };

  const handleDelete = (id: number) => {
    deleteMeeting(id);
    toast.success("Reunião excluída");
    reload();
  };

  const upcoming = meetings.find(m => new Date(m.meetingDate) >= new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Reuniões</h1>
        <Button onClick={() => setDialogOpen(true)} className="gradient-gold text-primary-foreground font-semibold glow-pulse" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nova Reunião
        </Button>
      </div>

      {upcoming && (
        <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gold" />
            <span className="text-xs text-gold font-medium">Próxima Reunião</span>
          </div>
          <h3 className="font-semibold">{upcoming.title}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {format(new Date(upcoming.meetingDate), "dd/MM/yyyy", { locale: ptBR })}
            {upcoming.hora && ` às ${upcoming.hora}`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {meetings.map(m => (
          <div key={m.id} className="bg-card rounded-lg border border-border p-4 hover:border-gold/20 transition-all cursor-pointer" onClick={() => setEditMeeting(m)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-gold">
                  {format(new Date(m.meetingDate), "dd/MM", { locale: ptBR })}
                </span>
                {m.hora && <span className="text-xs text-muted-foreground font-mono">às {m.hora}</span>}
              </div>
              {m.tipo && (
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${MEETING_TIPO_COLORS[m.tipo]}40`, color: MEETING_TIPO_COLORS[m.tipo] }}>
                  {m.tipo}
                </Badge>
              )}
            </div>

            <h3 className="text-sm font-semibold mb-1">{m.title}</h3>
            {m.notes && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{m.notes}</p>}

            {/* Location */}
            {m.local && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                {m.local.toLowerCase().includes("meet") || m.local.toLowerCase().includes("zoom") || m.local.toLowerCase().includes("online")
                  ? <Video className="w-3 h-3" />
                  : <MapPin className="w-3 h-3" />
                }
                <span>{m.local}</span>
              </div>
            )}

            {/* Participants */}
            {m.participantes && m.participantes.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex -space-x-1.5">
                  {m.participantes.slice(0, 4).map(p => (
                    <div key={p} className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-gold">
                      {p.charAt(0)}
                    </div>
                  ))}
                  {m.participantes.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                      +{m.participantes.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{m.participantes.length} participantes</span>
              </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
              <span className="text-[10px] text-muted-foreground">por {m.uploadedBy}</span>
              <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditMeeting(m)}>
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma reunião registrada</p>
            <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => setDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Nova Reunião
            </Button>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <MeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userName={userName}
        onSave={handleCreate}
      />

      {/* Edit dialog */}
      {editMeeting && (
        <MeetingDialog
          open={!!editMeeting}
          onOpenChange={b => { if (!b) setEditMeeting(null); }}
          userName={userName}
          onSave={handleUpdate}
          meeting={editMeeting}
        />
      )}
    </div>
  );
};

function MeetingDialog({ open, onOpenChange, userName, onSave, meeting }: {
  open: boolean; onOpenChange: (b: boolean) => void; userName: string;
  onSave: (data: Omit<Meeting, "id" | "createdAt">) => void;
  meeting?: Meeting;
}) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [hora, setHora] = useState("");
  const [tipo, setTipo] = useState<MeetingTipo>("Pontual");
  const [local, setLocal] = useState("");
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>("Agendada");
  const [fileType, setFileType] = useState<FileType>("pauta");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    if (open) {
      if (meeting) {
        setTitle(meeting.title);
        setMeetingDate(meeting.meetingDate);
        setHora(meeting.hora || "");
        setTipo(meeting.tipo || "Pontual");
        setLocal(meeting.local || "");
        setParticipantes(meeting.participantes || []);
        setNotes(meeting.notes);
        setMeetingStatus(meeting.meetingStatus || "Agendada");
        setFileType(meeting.fileType);
        setFileName(meeting.fileName);
        setFileUrl(meeting.fileUrl);
      } else {
        setTitle(""); setMeetingDate(""); setHora(""); setTipo("Pontual");
        setLocal(""); setParticipantes([]); setNotes(""); setMeetingStatus("Agendada");
        setFileType("pauta"); setFileName(""); setFileUrl("");
      }
    }
  }, [open, meeting]);

  const toggleParticipante = (name: string) => {
    setParticipantes(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gold">{meeting ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data *</label>
              <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="bg-secondary/40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hora</label>
              <Input type="time" value={hora} onChange={e => setHora(e.target.value)} className="bg-secondary/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select value={tipo} onValueChange={v => setTipo(v as MeetingTipo)}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={meetingStatus} onValueChange={v => setMeetingStatus(v as MeetingStatus)}>
                <SelectTrigger className="bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Local</label>
            <Input value={local} onChange={e => setLocal(e.target.value)} placeholder="Google Meet, Escritório, etc." className="bg-secondary/40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Participantes</label>
            <div className="flex flex-wrap gap-2">
              {TEAM_MEMBERS.map(name => (
                <label key={name} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={participantes.includes(name)} onCheckedChange={() => toggleParticipante(name)} />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pauta / Notas</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary/40 min-h-[60px]" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={!title.trim() || !meetingDate}
              onClick={() => onSave({ title, meetingDate, fileType, fileName, fileUrl, uploadedBy: meeting?.uploadedBy || userName, notes, hora, tipo, participantes, local, meetingStatus })}
              className="gradient-gold text-primary-foreground font-semibold">
              {meeting ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MeetingsPage;
