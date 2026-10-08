import { GitBranch } from "lucide-react";
import ComingSoon from "@/components/ui/ComingSoon";

export default function WorkflowPage() {
  return (
    <ComingSoon
      icon={GitBranch}
      title="Logic & workflows"
      description="Branch respondents to different questions based on their answers, calculate scores and set variables."
      items={["Logic jumps", "Branching", "Scoring", "Hidden fields"]}
    />
  );
}
