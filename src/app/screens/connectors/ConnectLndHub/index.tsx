import CompanionDownloadInfo from "@components/CompanionDownloadInfo";
import ConnectorForm from "@components/ConnectorForm";
import QrcodeScanner from "@components/QrcodeScanner";
import TextField from "@components/form/TextField";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import utils from "~/common/lib/utils";

export default function ConnectLndHub() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    uri: "",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value.trim(),
    });
  }

  function getConnectorType() {
    if (formData.uri.match(/\.onion/i)) {
      return "nativelndhub";
    }
    // default to LndHub
    return "lndhub";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const match = formData.uri.match(/lndhub:\/\/(\S+):(\S+)@(\S+)/i);
    if (!match) {
      toast.error("Invalid LNDHub URI");
      setLoading(false);
      return;
    }
    const login = match[1];
    const password = match[2];
    const url = match[3].replace(/\/$/, "");
    const account = {
      name: "LNDHub",
      config: {
        login,
        password,
        url,
      },
      connector: getConnectorType(),
    };

    try {
      let validation;
      // TODO: for native connectors we currently skip the validation because it is too slow (booting up Tor etc.)
      if (account.connector === "nativelndhub") {
        validation = { valid: true, error: "" };
      } else {
        validation = await utils.call("validateAccount", account);
      }

      if (validation.valid) {
        const addResult = await utils.call("addAccount", account);
        if (addResult.accountId) {
          await utils.call("selectAccount", {
            id: addResult.accountId,
          });
          navigate("/test-connection");
        }
      } else {
        console.error(validation);
        toast.error(
          `Connection failed. Is your LNDHub URI correct? \n\n(${validation.error})`
        );
      }
    } catch (e) {
      console.error(e);
      let message = "Connection failed. Is your LNDHub URI correct?";
      if (e instanceof Error) {
        message += `\n\n${e.message}`;
      }
      toast.error(message);
    }
    setLoading(false);
  }

  return (
    <ConnectorForm
      title="Connect to LNDHub (BlueWallet)"
      description='In BlueWallet, choose the wallet you want to connect, open it, click
      on "...", click on Export/Backup to display the QR code
      and scan it with your webcam.'
      submitLoading={loading}
      submitDisabled={formData.uri === ""}
      onSubmit={handleSubmit}
    >
      <div className="mb-6">
        <TextField
          id="uri"
          label="LNDHub Export URI"
          type="text"
          required
          placeholder="lndhub://..."
          pattern="lndhub://.+"
          title="lndhub://..."
          value={formData.uri}
          onChange={handleChange}
        />
      </div>
      {formData.uri.match(/\.onion/i) && (
        <div className="mb-6">
          <CompanionDownloadInfo />
        </div>
      )}
      <div>
        <p className="text-center my-4 dark:text-white">OR</p>
        <QrcodeScanner
          fps={10}
          qrbox={250}
          qrCodeSuccessCallback={(decodedText: string) => {
            if (formData.uri !== decodedText) {
              setFormData({
                ...formData,
                uri: decodedText,
              });
            }
          }}
          qrCodeErrorCallback={console.error}
        />
      </div>
    </ConnectorForm>
  );
}
