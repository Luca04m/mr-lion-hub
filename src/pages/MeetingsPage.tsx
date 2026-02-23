import { useState, useEffect } from "react";
import { getMeetings, createMeeting, deleteMeeting, getUser } from "@/lib/store";
import { Meeting, FileType, FILE_TYPE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, FileText, Calendar, ExternalLink, Paperclip } from "lucide-react";
import { format } from "date-fns";
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
          <p className="text-sm text-muted-foreground font-mono">{format(new Date(upcoming.meetingDate), "dd/MM/yyyy", { locale: ptBR })}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {meetings.map(m => (
          <div key={m.id} className="bg-card rounded-lg border border-border p-4 hover:border-gold/20 transition-all">
            <div className="flex items-start justify-between mb-2">
              <span className="text-lg font-bold font-mono text-gold">{format(new Date(m.meetingDate), "dd/MM", { locale: ptBR })}</span>
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${FILE_TYPE_COLORS[m.fileType]}40`, color: FILE_TYPE_COLORS[m.fileType] }}>
                {FILE_TYPE_LABELS[m.fileType]}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold mb-1">{m.title}</h3>
            {m.notes && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{m.notes}</p>}
            {m.fileName && (
              <div className="flex items-center gap-1.5 text-xs text-gold mb-2">
                <FileText className="w-3 h-3" />
                <span className="truncate">{m.fileName}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-muted-foreground">por {m.uploadedBy}</span>
              <div className="flex gap-1">
                {m.fileUrl && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => {
                        const a = document.createElement("a");
                        a.href = m.fileUrl;
                        a.target = "_blank";
                        a.download = m.fileName;
                        a.click();
                      }}>
                        <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Abrir arquivo</TooltipContent>
                  </Tooltip>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive">
                      <Trash2 className="w-3 h-3" />
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
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    if (open) { setTitle(""); setMeetingDate(""); setFileType("pauta"); setNotes(""); setFileName(""); setFileUrl(""); }
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

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
          
          {/* File upload */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Arquivo</label>
            {fileName && (
              <div className="flex items-center gap-2 text-xs bg-secondary/40 rounded px-2 py-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-gold" />
                <span className="truncate">{fileName}</span>
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:border-gold/30 transition-all cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" /> {fileName ? "Trocar arquivo" : "Anexar arquivo"}
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.md" onChange={handleFile} />
            </label>
          </div>

          <Textarea placeholder="Notas da reunião" value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary/40" />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={!title.trim() || !meetingDate}
              onClick={() => onSave({ title, meetingDate, fileType, fileName, fileUrl, uploadedBy: userName, notes })}
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
