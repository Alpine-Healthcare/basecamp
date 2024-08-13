import { FullScreenControl, SigmaContainer, ZoomControl } from "@react-sigma/core";
import { createNodeImageProgram } from "@sigma/node-image";
import { DirectedGraph } from "graphology";
import { constant, keyBy, mapValues, omit } from "lodash";
import { FC, useEffect, useMemo, useState } from "react";
import { BiBookContent, BiRadioCircleMarked } from "react-icons/bi";
import { BsArrowsFullscreen, BsFullscreenExit, BsZoomIn, BsZoomOut } from "react-icons/bs";
import { GrClose } from "react-icons/gr";
import { Settings } from "sigma/settings";

import { drawHover, drawLabel } from "../canvas-utils";
import { Dataset, FiltersState } from "../types";
import ClustersPanel from "./ClustersPanel";
import GraphDataController from "./GraphDataController";
import GraphEventsController from "./GraphEventsController";
import GraphSettingsController from "./GraphSettingsController";
import SearchField from "./SearchField";
import Mountains from "../images/mountains.webp";
import Logo from "../images/logo.png";


const Root: FC = () => {
  const [showContents, setShowContents] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [filtersState, setFiltersState] = useState<FiltersState>({
    clusters: {},
    tags: {},
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const sigmaSettings: Partial<Settings> = useMemo(
    () => ({
      nodeProgramClasses: {
        image: createNodeImageProgram({
          size: { mode: "force", value: 256 },
        }),
      },
      defaultDrawNodeLabel: drawLabel,
      defaultDrawNodeHover: drawHover,
      defaultNodeType: "image",
      defaultEdgeType: "arrow",
      labelDensity: 0.07,
      labelGridCellSize: 60,
      labelRenderedSizeThreshold: 15,
      labelFont: "Lato, sans-serif",
      zIndex: true,
    }),
    [],
  );

  // Load data on mount:
  useEffect(() => {
    fetch(`./dataset.json`)
      .then((res) => res.json())
      .then((dataset: Dataset) => {
        setDataset(dataset);
        setFiltersState({
          clusters: mapValues(keyBy(dataset.clusters, "key"), constant(true)),
          tags: mapValues(keyBy(dataset.tags, "key"), constant(true)),
        });
        requestAnimationFrame(() => setDataReady(true));
      });
  }, []);

  if (!dataset) return null;

  return (
    <div
      id="app-root"
      className={showContents ? "show-contents" : ""}
      style={{ display: 'flex', flexDirection: 'row'}}
    >
      <img src={Logo} width={50} height={50}  style={{ zIndex: 110, position : 'absolute', top: 15, left: 5}} />
      <img src={Mountains} width={40}  style={{ zIndex: 100, height: '100vh', width: "60px", objectFit: 'cover' }} />
      <div style={{ position: 'relative', paddingLeft: '60px', height: "100vh", width: 'calc(100vw - 60px)'}}>

      <SigmaContainer graph={DirectedGraph} settings={sigmaSettings} className="react-sigma">
        <GraphSettingsController hoveredNode={hoveredNode} />
        <GraphEventsController setHoveredNode={setHoveredNode} />
        <GraphDataController dataset={dataset} filters={filtersState} />

        {dataReady && (
          <>
            <div className="controls">
              <div className="react-sigma-control ico">
                <button
                  type="button"
                  className="show-contents"
                  onClick={() => setShowContents(true)}
                  title="Show caption and description"
                >
                  <BiBookContent />
                </button>
              </div>
              <FullScreenControl className="ico">
                <BsArrowsFullscreen />
                <BsFullscreenExit />
              </FullScreenControl>

              <ZoomControl className="ico">
                <BsZoomIn />
                <BsZoomOut />
                <BiRadioCircleMarked />
              </ZoomControl>
            </div>
            <div className="contents">
              <div className="ico">
                <button
                  type="button"
                  className="ico hide-contents"
                  onClick={() => setShowContents(false)}
                  title="Show caption and description"
                >
                  <GrClose />
                </button>
              </div>
              <div className="panels">
                <SearchField filters={filtersState} placeholder="Look up merkle root" />
                <SearchField filters={filtersState} />
                <ClustersPanel
                  clusters={dataset.clusters}
                  filters={filtersState}
                  setClusters={(clusters) =>
                    setFiltersState((filters) => ({
                      ...filters,
                      clusters,
                    }))
                  }
                  toggleCluster={(cluster) => {
                    setFiltersState((filters) => ({
                      ...filters,
                      clusters: filters.clusters[cluster]
                        ? omit(filters.clusters, cluster)
                        : { ...filters.clusters, [cluster]: true },
                    }));
                  }}
                />
              </div>
            </div>
          </>
        )}
      </SigmaContainer>




      </div>

    </div>
  );
};

export default Root;
