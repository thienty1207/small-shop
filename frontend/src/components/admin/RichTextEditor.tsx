import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { adminUploadImage } from "@/lib/admin-api";
import { API_BASE_URL } from "@/lib/api-base";
import "quill/dist/quill.snow.css";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onDeltaChange?: (delta: string) => void;
  onEditorReady?: (editor: any) => void;
};

const API_URL = API_BASE_URL;

const FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "indent",
  "link",
  "image",
  "video",
  "clean",
];

const normalizeValue = (next: string) => (next === "<p><br></p>" ? "" : next);

const resolveImageUrl = (url: string) => (url.startsWith("/") ? `${API_URL}${url}` : url);

function syncEditorHtml(quill: any, nextValue: string) {
  const normalized = normalizeValue(nextValue);
  const current = normalizeValue(quill.root.innerHTML);

  if (normalized === current) return;

  if (!normalized) {
    quill.setText("", "silent");
    return;
  }

  quill.setContents(quill.clipboard.convert({ html: normalized }), "silent");
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  onDeltaChange,
  onEditorReady,
}: RichTextEditorProps) {
  const [isReady, setIsReady] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);

  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onDeltaChangeRef = useRef(onDeltaChange);
  const onEditorReadyRef = useRef(onEditorReady);

  valueRef.current = value;
  onChangeRef.current = onChange;
  onDeltaChangeRef.current = onDeltaChange;
  onEditorReadyRef.current = onEditorReady;

  const handleImageUpload = useMemo(
    () => async (quill: any) => {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        setUploadError(null);

        try {
          const uploadedUrl = await adminUploadImage(file);
          const range = quill.getSelection(true);
          const index = range?.index ?? quill.getLength();
          quill.insertEmbed(index, "image", resolveImageUrl(uploadedUrl), "user");
          quill.setSelection(index + 1, 0, "silent");
        } catch (error) {
          setUploadError((error as Error).message);
        } finally {
          setUploadingImage(false);
        }
      };
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      const [{ default: Quill }] = await Promise.all([import("quill")]);
      if (!isMounted || !editorHostRef.current || !toolbarRef.current || quillRef.current) {
        return;
      }

      const quill = new Quill(editorHostRef.current, {
        theme: "snow",
        placeholder: placeholder ?? "",
        modules: {
          toolbar: {
            container: toolbarRef.current,
            handlers: {
              image: () => {
                void handleImageUpload(quill);
              },
            },
          },
        },
        formats: FORMATS,
      });

      syncEditorHtml(quill, valueRef.current);

      quill.on("text-change", () => {
        const nextValue = normalizeValue(quill.root.innerHTML);
        valueRef.current = nextValue;
        onChangeRef.current(nextValue);
        onDeltaChangeRef.current?.(JSON.stringify(quill.getContents()));
      });

      quillRef.current = quill;
      onEditorReadyRef.current?.(quill);
      setIsReady(true);
    };

    void setup();

    return () => {
      isMounted = false;
      quillRef.current = null;
      if (editorHostRef.current) {
        editorHostRef.current.innerHTML = "";
      }
    };
  }, [handleImageUpload, placeholder]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    syncEditorHtml(quill, value);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="admin-quill">
        <div
          ref={toolbarRef}
          className={`ql-toolbar ql-snow ${isReady ? "" : "invisible h-0 overflow-hidden border-0 p-0"}`}
        >
          <span className="ql-formats">
            <button type="button" className="ql-header" value="2" aria-label="Tiêu đề lớn" />
            <button type="button" className="ql-header" value="3" aria-label="Tiêu đề nhỏ" />
          </span>
          <span className="ql-formats">
            <button type="button" className="ql-bold" aria-label="In đậm" />
            <button type="button" className="ql-italic" aria-label="In nghiêng" />
            <button type="button" className="ql-underline" aria-label="Gạch chân" />
            <button type="button" className="ql-strike" aria-label="Gạch ngang" />
          </span>
          <span className="ql-formats">
            <button type="button" className="ql-list" value="ordered" aria-label="Danh sách số" />
            <button type="button" className="ql-list" value="bullet" aria-label="Danh sách chấm" />
          </span>
          <span className="ql-formats">
            <button type="button" className="ql-link" aria-label="Chèn liên kết" />
            <button type="button" className="ql-image" aria-label="Chèn ảnh" />
            <button type="button" className="ql-video" aria-label="Nhúng video" />
          </span>
          <span className="ql-formats">
            <button type="button" className="ql-clean" aria-label="Xóa định dạng" />
          </span>
        </div>
        <div ref={editorHostRef} />
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <ImagePlus className="w-3.5 h-3.5" />
          Hỗ trợ định dạng, chèn ảnh và nhúng video YouTube.
        </span>
        {uploadingImage && <span className="text-rose-400">Đang tải ảnh...</span>}
      </div>

      {uploadError && <p className="text-[11px] text-red-400">{uploadError}</p>}
    </div>
  );
}
