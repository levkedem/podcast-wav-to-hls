import axios, { AxiosError, isAxiosError } from "axios";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { v4 } from "uuid";

const ConvertWavPage: React.FC = () => {
  const [clientId, setClientId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [buttonTexst, setButtonText] = useState("Start HLS Conversion");
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  enum ConversionStatus {
    PROCESSING = "processing",
    COMPLETED = "completed",
    ERROR = "error",
  }

  useEffect(() => {
    const newClientId = v4();
    setClientId(newClientId);

    const socketInstance = io("http://localhost:3000");

    socketInstance.on("connect", () => {
      socketInstance.emit("register", { clientId: newClientId });
    });

    // the listener
    socketInstance.on(
      "conversionUpdate",
      (data: { status: string; message: string }) => {
        switch (data.status) {
          case ConversionStatus.PROCESSING:
            setIsProcessing(true);
            break;
          case ConversionStatus.COMPLETED:
          case ConversionStatus.ERROR:
            setIsProcessing(false);
            break;
        }
        setMessage(data.message);
      }
    );

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleDropFile = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 1 && acceptedFiles[0].type === "audio/wav") {
      const file = acceptedFiles[0];
      setCurrentFile(file);
    } else {
      toast.error("Please select a valid file.");
    }
  };

  const handleConvert = async () => {
    try {
      setButtonText("in process");
      const formData = new FormData();

      if (currentFile) {
        formData.append("file", currentFile, currentFile.name);
      } else {
        const response = await fetch("/inputFile.wav");
        const blob = await response.blob();
        formData.append("file", blob, "inputFile.wav");
      }

      const uploadResponse = await axios.post<{ fileName: string }>(
        "http://localhost:3000/process-hls",
        formData,
        {
          headers: {
            "client-id": clientId,
          },
        }
      );

      toast.success(`new playlist name: ${uploadResponse.data.fileName}`);

      setButtonText("Done! (click to convert again)");
    } catch (error) {
      setButtonText("we had an error :( (click to convert again)");

      console.error("Error during conversion:", error);
      toast.error(
        "error during conversion: " + isAxiosError(error)
          ? (error as AxiosError).message
          : "Unknown error"
      );
    }
  };

  return (
    <div>
      <h1>wav converter</h1>
      <Button
        style={{ backgroundColor: "#3c21b3", color: "white" }}
        label={buttonTexst}
        onClick={() => {
          handleConvert();
        }}
      />
      <Dropzone onDrop={(acceptedFiles) => handleDropFile(acceptedFiles)}>
        {({ getRootProps, getInputProps }) => (
          <section>
            <div
              {...getRootProps()}
              style={{
                border: "2px dashed #857b7b",
                padding: "20px",
                margin: "20px",
              }}
            >
              <input {...getInputProps()} />
              <p>Drag 'n' drop some files here, or click to select files</p>
            </div>
          </section>
        )}
      </Dropzone>
      <p>
        current file name:{" "}
        {currentFile != null ? currentFile.name : "inputFile.wav"}
      </p>
      {isProcessing && <p style={{ color: "#2bd17e" }}>{message}</p>}
    </div>
  );
};

export default ConvertWavPage;
