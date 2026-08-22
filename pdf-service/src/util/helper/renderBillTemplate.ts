import fs from 'fs/promises';
import Handlebars from 'handlebars';
import { BillTemplateData } from './pdfFormatters';
import { resolveTemplatePath } from './resolveTemplatePath';

const renderBillTemplate = async (payload: BillTemplateData): Promise<string> => {
  const templatePath = await resolveTemplatePath('bill.hbs');
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateSource);
  return template(payload);
};

export default renderBillTemplate;
