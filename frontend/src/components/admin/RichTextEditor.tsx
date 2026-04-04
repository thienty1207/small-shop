import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { adminUploadImage } from "@/lib/admin-api";
import "react-quill/dist/quill.snow.css";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  "clean",
];

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "image"],
  ["clean"],
];

const normalizeValue = (next: string) => (next === "<p><br></p>" ? "" : next);

const resolveImageUrl = (url: string) => (url.startsWith("/") ? `${API_URL}${url}` : url);

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [Quill, setQuill] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    import("react-quill").then((mod) => {
      if (isMounted) setQuill(() => mod.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleImageUpload = async () => {
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
        const quill = editorRef.current?.getEditor();
        if (!quill) return;
        const range = quill.getSelection(true);
        const index = range?.index ?? quill.getLength();
        quill.insertEmbed(index, "image", resolveImageUrl(uploadedUrl), "user");
        quill.setSelection(index + 1, 0);
      } catch (e) {
        setUploadError((e as Error).message);
      } finally {
        setUploadingImage(false);
      }
    };
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: TOOLBAR,
        handlers: {
          image: handleImageUpload,
        },
      },
    }),
    [],
  );

  if (!Quill) {
    return (
      <div className="space-y-1.5">
        <textarea
          rows={5}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 resize-y"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="admin-quill">
        <Quill
          ref={editorRef}
          theme="snow"
          value={value}
          onChange={(next) => onChange(normalizeValue(next))}
          modules={modules}
          formats={FORMATS}
          placeholder={placeholder}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <ImagePlus className="w-3.5 h-3.5" />
          Hỗ trợ định dạng + chèn ảnh trong mô tả.
        </span>
        {uploadingImage && <span className="text-rose-400">Đang tải ảnh...</span>}
      </div>
      {uploadError && <p className="text-[11px] text-red-400">{uploadError}</p>}
    </div>
  );
}
