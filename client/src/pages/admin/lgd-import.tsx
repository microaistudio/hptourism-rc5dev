import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Database, Upload, FileText, Building2, MapPin, CheckCircle, AlertCircle } from "lucide-react";

export default function LGDImport() {
  const [villagesCSV, setVillagesCSV] = useState("");
  const [urbanBodiesCSV, setUrbanBodiesCSV] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const { toast } = useToast();

  const handleImportVillages = async () => {
    if (!villagesCSV.trim()) {
      toast({
        title: "Error",
        description: "Please paste the villages CSV data",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const response = await apiRequest("POST", "/api/admin/lgd/import", {
        csvData: villagesCSV,
        dataType: "villages",
      });

      const data = await response.json() as {
        inserted: { districts: number; tehsils: number; gramPanchayats: number };
      };

      setImportResults(data);
      toast({
        title: "Import Successful",
        description: `Imported ${data.inserted.districts} districts, ${data.inserted.tehsils} tehsils, ${data.inserted.gramPanchayats} gram panchayats`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import LGD data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportUrbanBodies = async () => {
    if (!urbanBodiesCSV.trim()) {
      toast({
        title: "Error",
        description: "Please paste the urban bodies CSV data",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const response = await apiRequest("POST", "/api/admin/lgd/import", {
        csvData: urbanBodiesCSV,
        dataType: "urbanBodies",
      });

      const data = await response.json() as {
        inserted: { urbanBodies: number };
      };

      setImportResults(data);
      toast({
        title: "Import Successful",
        description: `Imported ${data.inserted.urbanBodies} urban bodies`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import LGD data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'villages' | 'urbanBodies') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (type === 'villages') {
        setVillagesCSV(text);
      } else {
        setUrbanBodiesCSV(text);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Database className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">LGD Master Data Import</h1>
        </div>
        <p className="text-muted-foreground">
          Import Local Government Directory data for Himachal Pradesh administrative hierarchy
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Import Order:</strong> Import Villages/Hierarchy data FIRST (creates districts and tehsils), 
          then import Urban Bodies data. CSV files must be in the correct format.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Villages/Hierarchy Import */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Villages & Hierarchy</CardTitle>
            </div>
            <CardDescription>
              Import districts, tehsils, and gram panchayats (rural areas)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="villages-csv">CSV Data (Districts → Tehsils → Villages)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Format: stateCode, districtCode, districtName, subdistrictCode, subdistrictName, villageCode, villageName, pincode
              </p>
              <Textarea
                id="villages-csv"
                placeholder="Paste CSV data here..."
                value={villagesCSV}
                onChange={(e) => setVillagesCSV(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                data-testid="textarea-villages-csv"
              />
              <div className="mt-2">
                <Label htmlFor="villages-file" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    Or upload CSV file
                  </div>
                  <input
                    id="villages-file"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'villages')}
                    data-testid="input-villages-file"
                  />
                </Label>
              </div>
            </div>

            <Button
              onClick={handleImportVillages}
              disabled={isImporting || !villagesCSV.trim()}
              className="w-full"
              data-testid="button-import-villages"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import Villages Data"}
            </Button>
          </CardContent>
        </Card>

        {/* Urban Bodies Import */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Urban Bodies</CardTitle>
            </div>
            <CardDescription>
              Import municipalities and town panchayats (urban areas)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="urban-csv">CSV Data (Municipalities & Town Panchayats)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Format: stateCode, localBodyCode, localBodyName, localBodyType, pincode
              </p>
              <Textarea
                id="urban-csv"
                placeholder="Paste CSV data here..."
                value={urbanBodiesCSV}
                onChange={(e) => setUrbanBodiesCSV(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                data-testid="textarea-urban-csv"
              />
              <div className="mt-2">
                <Label htmlFor="urban-file" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    Or upload CSV file
                  </div>
                  <input
                    id="urban-file"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'urbanBodies')}
                    data-testid="input-urban-file"
                  />
                </Label>
              </div>
            </div>

            <Button
              onClick={handleImportUrbanBodies}
              disabled={isImporting || !urbanBodiesCSV.trim()}
              className="w-full"
              data-testid="button-import-urban"
            >
              <Building2 className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import Urban Bodies Data"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import Results */}
      {importResults && (
        <Card className="mt-6 border-green-500/50 bg-green-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-700 dark:text-green-400">Import Successful</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{importResults.inserted.districts}</div>
                <div className="text-xs text-muted-foreground">Districts</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{importResults.inserted.tehsils}</div>
                <div className="text-xs text-muted-foreground">Tehsils</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{importResults.inserted.blocks}</div>
                <div className="text-xs text-muted-foreground">Blocks</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{importResults.inserted.gramPanchayats}</div>
                <div className="text-xs text-muted-foreground">Villages</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{importResults.inserted.urbanBodies}</div>
                <div className="text-xs text-muted-foreground">Urban Bodies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Import Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <span className="font-semibold text-foreground">Step 1:</span>
            <span>Import <strong>Villages & Hierarchy</strong> data first. This creates the district and tehsil structure.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-foreground">Step 2:</span>
            <span>Import <strong>Urban Bodies</strong> data. This adds municipalities and town panchayats.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-foreground">Note:</span>
            <span>Only Himachal Pradesh data (stateCode = 2) will be imported. Other states will be automatically skipped.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-foreground">CSV Source:</span>
            <span>Use official LGD data from lgdirectory.gov.in or data.gov.in</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
