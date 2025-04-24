import axios, { AxiosError, isAxiosError } from "axios";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { v4 } from "uuid";

const ConvertWavPage: React.FC = () => {
  const [clientId, setClientId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [buttonTexst, setButtonText] = useState("Start HLS Conversion");

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
        if (data.status === ConversionStatus.PROCESSING) {
          setIsProcessing(true);
        } else if (data.status === ConversionStatus.COMPLETED) {
          setIsProcessing(false);
        } else if (data.status === ConversionStatus.ERROR) {
          setIsProcessing(false);
        }
        setMessage(data.message);
      }
    );

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleConvert = async () => {
    try {
      setButtonText("in process");
      const formData = new FormData();
      const response = await fetch("/inputFile.wav");
      const blob = await response.blob();
      formData.append("file", blob, "inputFile.wav");

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
        label={buttonTexst}
        onClick={() => {
          handleConvert();
        }}
      />
      {isProcessing && <p>{message}</p>}
    </div>
  );
};

export default ConvertWavPage;
