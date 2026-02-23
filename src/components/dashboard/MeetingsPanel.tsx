import { useState, useRef } from "react";
import { Meeting, FileType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Trash2, Download, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface MeetingsPanelProps {
  meetings: Meeting[];
  userName: string;
  onCreate: (data: Omit<Meeting, "id" | "createdAt">) => void;
  onDelete: (id: number) => void;
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  pauta: "Pauta",
  resumo: "Resumo",
  outro: "Outro",
};

export const MeetingsPanel = ({ meetings, userName, onCreate, onDelete }: MeetingsPanelProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [fileType, setFileType] = useState<FileType>("pauta");
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      // Store as data URL for local access
      setFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!title.trim() || !meetingDate || !fileName) return;
    onCreate({
      title: title.trim(),
      meetingDate,
      fileType,
      fileName,
      fileUrl: fileData,
      uploadedBy: userName,
    });
    setTitle("");
    setMeetingDate("");
    setFileType("pauta");
    setFileName("");
    setFileData("");
    setDialogOpen(false);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gradient-gold text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Nova Reunião
        </Button>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma reunião registrada ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="gradient-card border border-border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gold" />
                <div>
                  <h4 className="font-medium text-foreground">{m.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{m.meetingDate}</span>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">
                      {FILE_TYPE_LABELS[m.fileType]}
                    </span>
                    <span className="text-xs text-muted-foreground">por {m.uploadedBy}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.fileUrl && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={m.fileUrl} download={m.fileName} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(m.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nova Reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 bg-secondary/50 border-border" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Data da Reunião *</Label>
              <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="mt-1 bg-secondary/50 border-border" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Tipo</Label>
              <Select value={fileType} onValueChange={v => setFileType(v as FileType)}>
                <SelectTrigger className="mt-1 bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FILE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Arquivo *</Label>
              <div className="mt-1">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-dashed border-border"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {fileName || "Selecionar arquivo"}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!title.trim() || !meetingDate || !fileName} className="gradient-gold text-primary-foreground">
                Criar Reunião
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
