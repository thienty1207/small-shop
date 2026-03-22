export type FragranceGender = "male" | "female" | "unisex";
export type FragranceLine = "designer" | "niche" | "clone";
export type HomepageSection = FragranceGender;

export interface FragranceOption<T extends string> {
  value: T;
  label: string;
  helper: string;
}

export const FRAGRANCE_GENDER_OPTIONS: FragranceOption<FragranceGender>[] = [
  {
    value: "male",
    label: "Nước hoa nam",
    helper: "Tone hương nam tính, mạnh mẽ và rõ cá tính.",
  },
  {
    value: "female",
    label: "Nước hoa nữ",
    helper: "Tone hương mềm mại, nữ tính và nổi bật.",
  },
  {
    value: "unisex",
    label: "Nước hoa unisex",
    helper: "Dễ dùng cho cả nam lẫn nữ, cân bằng và linh hoạt.",
  },
];

export const FRAGRANCE_LINE_OPTIONS: FragranceOption<FragranceLine>[] = [
  {
    value: "designer",
    label: "Designer",
    helper: "Từ các thương hiệu lớn như Gucci, Azzaro, LV.",
  },
  {
    value: "niche",
    label: "Niche",
    helper: "Nhà hương chuyên sâu, tập trung hoàn toàn vào nước hoa.",
  },
  {
    value: "clone",
    label: "Clone",
    helper: "Phiên bản lấy cảm hứng từ designer hoặc niche, thường đến từ Dubai hoặc Ả Rập.",
  },
];

export const HOMEPAGE_SECTION_OPTIONS: FragranceOption<HomepageSection>[] = [
  {
    value: "male",
    label: "Section nước hoa nam",
    helper: "Đưa sản phẩm này vào section Nước hoa nam trên trang chủ.",
  },
  {
    value: "female",
    label: "Section nước hoa nữ",
    helper: "Đưa sản phẩm này vào section Nước hoa nữ trên trang chủ.",
  },
  {
    value: "unisex",
    label: "Section nước hoa unisex",
    helper: "Đưa sản phẩm này vào section Nước hoa unisex trên trang chủ.",
  },
];

const genderLabelMap: Record<FragranceGender, string> = Object.fromEntries(
  FRAGRANCE_GENDER_OPTIONS.map((option) => [option.value, option.label]),
) as Record<FragranceGender, string>;

const genderHelperMap: Record<FragranceGender, string> = Object.fromEntries(
  FRAGRANCE_GENDER_OPTIONS.map((option) => [option.value, option.helper]),
) as Record<FragranceGender, string>;

const lineLabelMap: Record<FragranceLine, string> = Object.fromEntries(
  FRAGRANCE_LINE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<FragranceLine, string>;

const lineHelperMap: Record<FragranceLine, string> = Object.fromEntries(
  FRAGRANCE_LINE_OPTIONS.map((option) => [option.value, option.helper]),
) as Record<FragranceLine, string>;

const homepageSectionLabelMap: Record<HomepageSection, string> = Object.fromEntries(
  HOMEPAGE_SECTION_OPTIONS.map((option) => [option.value, option.label]),
) as Record<HomepageSection, string>;

const homepageSectionHelperMap: Record<HomepageSection, string> = Object.fromEntries(
  HOMEPAGE_SECTION_OPTIONS.map((option) => [option.value, option.helper]),
) as Record<HomepageSection, string>;

export function getFragranceGenderLabel(value?: string | null): string {
  if (!value) return "";
  return genderLabelMap[value as FragranceGender] ?? value;
}

export function getFragranceGenderHelper(value?: string | null): string {
  if (!value) return "";
  return genderHelperMap[value as FragranceGender] ?? "";
}

export function getFragranceLineLabel(value?: string | null): string {
  if (!value) return "";
  return lineLabelMap[value as FragranceLine] ?? value;
}

export function getFragranceLineHelper(value?: string | null): string {
  if (!value) return "";
  return lineHelperMap[value as FragranceLine] ?? "";
}

export function getHomepageSectionLabel(value?: string | null): string {
  if (!value) return "";
  return homepageSectionLabelMap[value as HomepageSection] ?? value;
}

export function getHomepageSectionHelper(value?: string | null): string {
  if (!value) return "";
  return homepageSectionHelperMap[value as HomepageSection] ?? "";
}
