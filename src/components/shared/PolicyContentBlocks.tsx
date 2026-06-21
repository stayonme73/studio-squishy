import type { PolicyContentBlock } from "@/config/policies";

type Props = {
  blocks: readonly PolicyContentBlock[];
  className?: string;
};

/** Renders FAQ / policy copy blocks from policies.ts without rewriting content. */
export default function PolicyContentBlocks({ blocks, className }: Props) {
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.kind === "p") {
          return (
            <p key={`p-${index}`} className="utility-blocks__p">
              {block.text}
            </p>
          );
        }

        return (
          <div key={`ul-${index}`} className="utility-blocks__list-wrap">
            {block.intro ? <p className="utility-blocks__list-intro">{block.intro}</p> : null}
            <ul className="utility-blocks__list">
              {block.items.map((item) => (
                <li key={item} className="utility-blocks__list-item">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
