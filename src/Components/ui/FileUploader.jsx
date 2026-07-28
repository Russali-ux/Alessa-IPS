import { useState, useRef } from "react";
import { X, RotateCcw, Check } from "lucide-react";

export const FileUploader = ({
  label = "Cargar archivo",
  onFileSelect = () => {},
  accept = "*",
  multiple = false,
  simulateUpload = true,
}) => {
  const inputRef = useRef(null);
  const [fileInfo, setFileInfo] = useState(null); // { file, status: "success" | "error" | "uploading" }
  const [isDragging, setIsDragging] = useState(false);

  const openFileDialog = () => inputRef.current.click();

  const handleFiles = (files) => {
    const file = multiple ? files : files[0];
    setFileInfo({ file, status: "uploading" });

    onFileSelect(file);

    // Simulación de carga
    if (simulateUpload) {
      setTimeout(() => {
        const success = Math.random() > 0.3;
        setFileInfo({
          file,
          status: success ? "success" : "error",
        });
      }, 1200);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFiles(files);
  };

  const removeFile = () => setFileInfo(null);

  const retryUpload = () => {
    if (!fileInfo) return;
    setFileInfo({ ...fileInfo, status: "uploading" });

    setTimeout(() => {
      const success = Math.random() > 0.2;
      setFileInfo({
        file: fileInfo.file,
        status: success ? "success" : "error",
      });
    }, 1300);
  };

  const bgColor =
    fileInfo?.status === "success"
      ? "bg-green-500/90 border-green-600"
      : fileInfo?.status === "error"
      ? "bg-red-500/90 border-red-600"
      : "bg-gray-50 border-gray-300";

  return (
    <div className="flex flex-col space-y-2">
      {label && <label className="font-medium">{label}</label>}

      {/* Área de carga */}
      <div
        className={`
          w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200 
          ${isDragging ? "bg-blue-50 border-blue-400" : "bg-gray-50 border-gray-300"}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <p className="text-gray-600">
          Arrastre y suelte su documento o{" "}
          <span className="text-blue-600 underline">Explorar</span>
        </p>

        <input
          type="file"
          ref={inputRef}
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Vista del archivo cargado */}
      {fileInfo && (
        <div
          className={`
            mt-2 border rounded-lg p-3 flex items-center justify-between text-white
            ${fileInfo.status === "uploading" ? "bg-blue-400" : bgColor}
          `}
        >
          {/* Información del archivo */}
          <div>
            <p className="font-semibold">
              {fileInfo.file.name}
            </p>
            <p className="text-sm opacity-80">
              {(fileInfo.file.size / 1024).toFixed(1)} KB
            </p>

            {fileInfo.status === "error" && (
              <p className="text-xs mt-1">Ocurrió un error. Toque para reintentar.</p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {fileInfo.status === "success" && <Check size={20} />}

            {fileInfo.status === "error" && (
              <button
                onClick={retryUpload}
                className="hover:opacity-80"
              >
                <RotateCcw size={22} />
              </button>
            )}

            <button
              onClick={removeFile}
              className="hover:opacity-80"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
