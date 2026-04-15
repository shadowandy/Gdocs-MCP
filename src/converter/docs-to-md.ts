/**
 * Google Docs JSON to Markdown Converter
 */

export class DocsToMdConverter {
  convert(doc: any): string {
    let markdown = '';
    const body = doc.body;

    if (!body || !body.content) return '';

    for (const element of body.content) {
      if (element.paragraph) {
        markdown += this.processParagraph(element.paragraph);
      } else if (element.table) {
        markdown += this.processTable(element.table);
      }
    }

    return markdown;
  }

  private processParagraph(paragraph: any): string {
    let text = '';
    const elements = paragraph.elements || [];

    for (const el of elements) {
      if (el.textRun) {
        text += this.processTextRun(el.textRun);
      }
    }

    const style = paragraph.paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
    
    if (style.startsWith('HEADING_')) {
      const level = parseInt(style.split('_')[1], 10);
      return '#'.repeat(level) + ' ' + text.trim() + '\n\n';
    }

    return text + '\n';
  }

  private processTextRun(textRun: any): string {
    let content = textRun.content || '';
    const style = textRun.textStyle || {};

    if (style.link) {
      content = `[${content.trim()}](${style.link.url})`;
    }
    if (style.bold) {
      content = `**${content.trim()}**`;
    }
    if (style.italic) {
      content = `*${content.trim()}*`;
    }

    return content;
  }

  private processTable(table: any): string {
    let markdown = '|';
    const rows = table.tableRows || [];
    
    // Header
    if (rows.length > 0) {
      const firstRow = rows[0].tableCells || [];
      markdown += firstRow.map((c: any) => this.getCellText(c).trim()).join('|') + '|\n';
      markdown += '|' + firstRow.map(() => '---').join('|') + '|\n';
    }

    // Body
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].tableCells || [];
      markdown += '|' + cells.map((c: any) => this.getCellText(c).trim()).join('|') + '|\n';
    }

    return markdown + '\n';
  }

  private getCellText(cell: any): string {
    let text = '';
    const content = cell.content || [];
    for (const el of content) {
      if (el.paragraph) {
        text += this.processParagraph(el.paragraph);
      }
    }
    return text.trim();
  }
}
