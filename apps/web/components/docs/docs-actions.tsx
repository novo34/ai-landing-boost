'use client';

import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/client';
import { useToast } from '@/hooks/use-toast';

interface DocsActionsProps {
  content: string;
  title: string;
}

export function DocsActions({ content, title }: DocsActionsProps) {
  const { t } = useTranslation('common');
  const { toast } = useToast();

  const exportToPDF = async () => {
    try {
      // Crear un documento HTML temporal
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error(t('documentation.export_pdf_error') || 'Could not open print window');
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.6;
              }
              h1 { font-size: 2em; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { font-size: 1.5em; border-bottom: 1px solid #666; padding-bottom: 5px; margin-top: 30px; }
              h3 { font-size: 1.2em; margin-top: 20px; }
              code {
                background: #f4f4f4;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
              }
              pre {
                background: #f4f4f4;
                padding: 15px;
                border-radius: 5px;
                overflow-x: auto;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 20px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #f2f2f2;
              }
              @media print {
                body { margin: 0; padding: 15px; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body>
            ${content
              .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
              .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
              .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
              .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
              .replace(/`([^`]+)`/g, '<code>$1</code>')
              .replace(/```[\s\S]*?```/g, (match) => {
                const code = match.replace(/```[\w]*\n?/g, '');
                return `<pre><code>${code}</code></pre>`;
              })
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>')
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/^(.+)$/gm, '<p>$1</p>')}
          </body>
        </html>
      `);

      printWindow.document.close();
      
      // Esperar a que cargue y luego imprimir/guardar como PDF
      setTimeout(() => {
        printWindow.print();
      }, 250);

      toast({
        title: t('documentation.export_pdf') || 'Export to PDF',
        description: t('documentation.export_pdf_description') || 'The document will open in a new window to print or save as PDF',
      });
    } catch (error) {
      toast({
        title: t('error') || 'Error',
        description: t('documentation.export_pdf_failed') || 'Could not export document',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2 mb-4 no-print">
      <Button
        variant="outline"
        size="sm"
        onClick={exportToPDF}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {t('documentation.export_pdf') || 'Exportar a PDF'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="gap-2"
      >
        <Printer className="h-4 w-4" />
        {t('documentation.print') || 'Imprimir'}
      </Button>
    </div>
  );
}
