import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { FC, PropsWithChildren, useEffect, useState } from "react";

function getMouseLayer() {
  return document.querySelector(".sigma-mouse");
}

const GraphEventsController: FC<PropsWithChildren<{ setHoveredNode: (node: string | null) => void }>> = ({
  setHoveredNode,
  children,
}) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const registerEvents = useRegisterEvents();
  const [ showNodeData, setShowNodeData ] = useState(false)
  const [ nodeData, setNodeData ] = useState(null)

  /**
   * Initialize here settings that require to know the graph and/or the sigma
   * instance:
   */
  useEffect(() => {
    registerEvents({
      clickNode(data) {
        const { node } = data;
        const nodeData = graph.getNodeAttributes(node)
        delete nodeData.data["core"]
        setNodeData(nodeData.data)
        setShowNodeData(true)
      },
      enterNode({ node }) {
        setHoveredNode(node);
        // TODO: Find a better way to get the DOM mouse layer:
        const mouseLayer = getMouseLayer();
        if (mouseLayer) mouseLayer.classList.add("mouse-pointer");
      },
      leaveNode() {
        setHoveredNode(null);
        // TODO: Find a better way to get the DOM mouse layer:
        const mouseLayer = getMouseLayer();
        if (mouseLayer) mouseLayer.classList.remove("mouse-pointer");
        setNodeData(null)
        setShowNodeData(false)
      },
    });
  }, []);

  return <>
  { showNodeData ? (
    <div className="panel" style={{ position: 'absolute', bottom: 0, right: 10, height: "500px", width: "300px"}}>
      <p>
        {JSON.stringify(nodeData)}
      </p>

    </div>

  ): null}
  {children}
  </>;
};

export default GraphEventsController;
