import axios from "axios";
import { Button } from "primereact/button";

const ConvertWavPage: React.FC = () => {
  const handleConvert = async () => {
    try {
      const formData = new FormData();
      const response = await fetch("/input.wav");
      const blob = await response.blob();
      formData.append("file", blob, "input.wav");

      const uploadResponse = await axios.post<{ fileName: string }>(
        "http://localhost:3000/process-hls",
        formData
      );

      alert("File converted successfully: " + uploadResponse.data.fileName);
    } catch (error) {
      console.error("Error during conversion:", error);
      alert("Error during conversion: " + error);
    }
  };

  return (
    <div>
      <h1>wav converter</h1>
      <Button
        label={"Start HLS Conversion"}
        onClick={() => {
          handleConvert();
        }}
      />
    </div>
  );
};

export default ConvertWavPage;
