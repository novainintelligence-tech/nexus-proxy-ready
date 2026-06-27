import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bulkUploadProxies } from "@/lib/api.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.length);
  if (!lines.length) return [];
  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === ",") { out.push(cur); cur = ""; }
        else if (c === '"') inQ = true;
        else cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((l) => {
    const cells = parseLine(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

export function ProxyCsvUpload() {
  const qc = useQueryClient();
  const upload = useServerFn(bulkUploadProxies);
  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<{ inserted: number; errors: any[] } | null>(null);

  const mut = useMutation({
    mutationFn: (rows: Record<string, string>[]) => upload({ data: { rows } }),
    onSuccess: (r: any) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["socks-list"] });
      toast.success(`Imported ${r.inserted} proxies${r.errors.length ? ` (${r.errors.length} errors)` : ""}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
  });

  const onFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const rows = parseCsv(text);
    setAllRows(rows);
    setPreview(rows.slice(0, 5));
    if (!rows.length) toast.error("CSV is empty");
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" /> Proxy CSV Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Headers (case-insensitive): <code>ip, port, username, password, proxy_type, protocol, auth_type, country, region, city, zipcode, host, speed_mbps, blacklist, source, external_id</code>.
          Duplicates of <code>(ip, port, username)</code> are updated in place.
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Label htmlFor="csv" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted">
            <FileText className="w-4 h-4" /> Choose CSV
          </Label>
          <Input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {fileName && <span className="text-sm text-muted-foreground">{fileName} — {allRows.length} rows</span>}
          <Button
            disabled={!allRows.length || mut.isPending}
            onClick={() => mut.mutate(allRows)}
          >
            {mut.isPending ? "Uploading…" : `Upload ${allRows.length || ""}`}
          </Button>
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>{Object.keys(preview[0]).map((h) => (<th key={h} className="text-left px-2 py-1">{h}</th>))}</tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t">
                    {Object.keys(preview[0]).map((h) => (<td key={h} className="px-2 py-1 font-mono">{r[h]}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" /> Inserted/updated: {result.inserted}
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" /> Errors ({result.errors.length})
                </div>
                <ul className="list-disc list-inside text-xs text-muted-foreground max-h-40 overflow-y-auto">
                  {result.errors.slice(0, 50).map((e: any, i: number) => (
                    <li key={i}>row {e.row}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}