import { Plug } from "lucide-react";
import ComingSoon from "@/components/ui/ComingSoon";

export default function ConnectPage() {
  return (
    <ComingSoon
      icon={Plug}
      title="Integrations"
      description="Send responses to the tools you already use, or to your own endpoint with webhooks."
      items={["Webhooks", "Google Sheets", "Slack", "Notion", "HubSpot", "Zapier"]}
    />
  );
}
