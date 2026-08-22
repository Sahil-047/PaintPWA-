import fs from 'fs/promises';
import Handlebars from 'handlebars';
import { CashMemoTemplateData } from './pdfFormatters';
import { resolveTemplatePath } from './resolveTemplatePath';

const renderCashMemoTemplate = async (payload: CashMemoTemplateData): Promise<string> => {
  const templatePath = await resolveTemplatePath('cashmemo.hbs');
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateSource);
  return template(payload);
};

export default renderCashMemoTemplate;
