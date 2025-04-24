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
        } else {
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
    } catch (error) {
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
        label={isProcessing ? message : "Start HLS Conversion"}
        onClick={() => {
          handleConvert();
        }}
      />
    </div>
  );
};

export default ConvertWavPage;
