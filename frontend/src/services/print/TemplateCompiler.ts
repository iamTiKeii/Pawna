import { renderTemplate, getDefaultTemplateCode } from "./PrintTemplateManager";

/**
 * TemplateCompiler handles direct compilation of raw HTML templates with data mappings.
 */
export class TemplateCompiler {
  /**
   * Compiles HTML template given a template code and key-value replacements.
   */
  static compile(templateCode: string, data: Record<string, string>): string {
    return renderTemplate(templateCode, data);
  }

  /**
   * Resolves appropriate template code based on module type and system settings / localStorage preference.
   */
  static getActiveTemplateCode(
    module: "pawn" | "unsecured" | "installment" | "capital" | "receipt" | "payment",
    overrideCode?: string,
    systemSettings?: Record<string, string>
  ): string {
    if (overrideCode) return overrideCode;

    const settingKey = `${module}_print_template`;
    if (systemSettings && systemSettings[settingKey]) {
      return systemSettings[settingKey];
    }

    const localSaved = localStorage.getItem(settingKey) || localStorage.getItem(`template_${module}`);
    if (localSaved) {
      if (localSaved === "negotiated") {
        return module === "pawn" ? "cd_02_001.html" : getDefaultTemplateCode(module);
      } else if (localSaved === "interest") {
        return getDefaultTemplateCode(module);
      }
      return localSaved;
    }

    return getDefaultTemplateCode(module);
  }
}
