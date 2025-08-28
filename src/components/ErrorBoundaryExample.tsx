import { useState } from 'react';
import { ComponentErrorBoundary } from './ErrorBoundary';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// Example component that can throw errors for testing
function ErrorProneComponent({ shouldError }: { shouldError: boolean }) {
  if (shouldError) {
    throw new Error("This is a test error thrown by ErrorProneComponent!");
  }

  return (
    <div className="p-4 bg-primary/10 border border-primary rounded-lg">
      <p className="text-primary font-medium">✅ Component rendered successfully!</p>
      <p className="text-sm text-muted-foreground mt-1">
        This component is wrapped in an error boundary and working properly.
      </p>
    </div>
  );
}

// Example of how to use error boundaries in your components
export function ErrorBoundaryExample() {
  const [triggerError, setTriggerError] = useState(false);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Error Boundary Example</CardTitle>
        <CardDescription>
          Test how error boundaries handle component errors gracefully
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => setTriggerError(false)}
            variant={!triggerError ? "default" : "outline"}
          >
            Show Working Component
          </Button>
          <Button
            onClick={() => setTriggerError(true)}
            variant={triggerError ? "destructive" : "outline"}
          >
            Trigger Error
          </Button>
        </div>

        <ComponentErrorBoundary>
          <ErrorProneComponent shouldError={triggerError} />
        </ComponentErrorBoundary>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">How it works:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Wrap components with <code className="bg-muted px-1 rounded">ComponentErrorBoundary</code></li>
            <li>Errors are caught and displayed with a retry option</li>
            <li>Stack traces shown in development mode</li>
            <li>Production shows user-friendly error messages</li>
            <li>Uses your CSS variables for consistent theming</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}