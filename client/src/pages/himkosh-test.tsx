import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

export default function HimKoshTest() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [callbackUrl, setCallbackUrl] = useState('https://eservices.himachaltourism.gov.in/api/himkosh/callback');
  const [applicationId, setApplicationId] = useState('');

  // Common production URL patterns to test
  const suggestedUrls = [
    'https://eservices.himachaltourism.gov.in/api/himkosh/callback',
    'https://eservices.himachaltourism.gov.in/himkosh/callback',
    'https://eservices.himachaltourism.gov.in/payment/himkosh/callback',
    'https://eservices.himachaltourism.gov.in/payment/callback',
    'https://eservices.himachaltourism.gov.in/api/payment/callback',
    'https://eservices.himachaltourism.gov.in/challan/callback',
  ];

  const testCallbackUrl = async () => {
    if (!callbackUrl || !applicationId) {
      toast({
        title: 'Error',
        description: 'Please enter both callback URL and application ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/himkosh/test-callback-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackUrl,
          applicationId,
        }),
      }).then(r => r.json());

      setTestResult(response);

      toast({
        title: 'Test Data Generated',
        description: 'Click "Try Payment" to test if checksum passes',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate test data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openPaymentUrl = () => {
    if (testResult?.paymentUrl) {
      window.open(testResult.paymentUrl, '_blank');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>HimKosh Production Callback URL Tester</CardTitle>
          <CardDescription>
            Test different production callback URLs to see which one makes the checksum pass
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Application ID Input */}
          <div className="space-y-2">
            <Label htmlFor="applicationId">Application ID (from database)</Label>
            <Input
              id="applicationId"
              data-testid="input-application-id"
              placeholder="e.g., 3fbc97bd-df06-45ec-a33a-e4bc39a49410"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use an application ID from your test applications (HP-HS-TEST-001 through HP-HS-TEST-010)
            </p>
          </div>

          {/* Callback URL Input */}
          <div className="space-y-2">
            <Label htmlFor="callbackUrl">Production Callback URL to Test</Label>
            <Input
              id="callbackUrl"
              data-testid="input-callback-url"
              placeholder="https://eservices.himachaltourism.gov.in/..."
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
            />
          </div>

          {/* Suggested URLs */}
          <div className="space-y-2">
            <Label>Try These Common Patterns:</Label>
            <div className="grid grid-cols-1 gap-2">
              {suggestedUrls.map((url) => (
                <Button
                  key={url}
                  variant="outline"
                  size="sm"
                  data-testid={`button-suggest-${url.split('/').pop()}`}
                  onClick={() => setCallbackUrl(url)}
                  className="justify-start text-xs"
                >
                  {url}
                </Button>
              ))}
            </div>
          </div>

          {/* Test Button */}
          <Button
            onClick={testCallbackUrl}
            disabled={loading || !callbackUrl || !applicationId}
            data-testid="button-test"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Test Data...
              </>
            ) : (
              'Generate Test Payment'
            )}
          </Button>

          {/* Test Result */}
          {testResult && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="text-lg">Test Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Test Callback URL:</Label>
                  <code className="block p-2 bg-muted rounded text-xs break-all">
                    {testResult.testUrl}
                  </code>
                </div>

                <div className="space-y-2">
                  <Label>Calculated Checksum:</Label>
                  <code className="block p-2 bg-muted rounded text-xs font-mono">
                    {testResult.checksum}
                  </code>
                </div>

                <div className="space-y-2">
                  <Label>Request String (before encryption):</Label>
                  <code className="block p-2 bg-muted rounded text-xs break-all max-h-32 overflow-y-auto">
                    {testResult.requestString}
                  </code>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded border border-yellow-200 dark:border-yellow-800">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Next Step: Test on HimKosh
                  </h4>
                  <p className="text-sm mb-3">
                    Click the button below to open HimKosh portal. If the checksum passes, you'll see payment options.
                    If it fails, you'll see "Invalid Request" or checksum error.
                  </p>
                  <Button
                    onClick={openPaymentUrl}
                    data-testid="button-try-payment"
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Try Payment on HimKosh (₹1)
                  </Button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold mb-2">What to Look For:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Checksum passes:</strong> You'll see payment mode selection (Credit Card, Debit Card, UPI, Net Banking)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Checksum fails:</strong> You'll see "Invalid Request", "Checksum Mismatch", or error message</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
