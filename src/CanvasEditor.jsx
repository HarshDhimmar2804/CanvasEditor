import React, { useState, useRef } from "react";
import { Stage, Layer, Text, Image, Transformer } from "react-konva";
import useImage from "use-image";
import jsPDF from "jspdf";

const EditableText = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef();
  const trRef = useRef();
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(shapeProps.text);

  React.useEffect(() => {
    if (isSelected) {
      trRef.current?.nodes([shapeRef.current]);
      trRef.current?.getLayer().batchDraw();
    }
  }, [isSelected]);

  const handleDoubleClick = () => setIsEditing(true);

  const handleBlur = () => {
    onChange({ ...shapeProps, text: textValue });
    setIsEditing(false);
  };

  return (
    <>
      {isEditing ? (
        <input
          style={{
            position: "absolute",
            top: shapeProps.y,
            left: shapeProps.x,
            fontSize: shapeProps.fontSize,
            transform: "translate(-50%, -50%)",
          }}
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <Text
          {...shapeProps}
          ref={shapeRef}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDoubleClick}
          onDragEnd={(e) => {
            onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
          }}
          onTransformEnd={(e) => {
            const node = shapeRef.current;
            const scaleY = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            onChange({
              ...shapeProps,
              x: node.x(),
              y: node.y(),
              fontSize: shapeProps.fontSize * scaleY,
            });
          }}
          fontStyle={shapeProps.fontStyle || "normal"}
          fill={shapeProps.fill || "black"}
        />
      )}
      {isSelected && !isEditing && <Transformer ref={trRef} />}
    </>
  );
};

const DraggableImage = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const [image] = useImage(shapeProps.src);
  const shapeRef = useRef();
  const trRef = useRef();

  React.useEffect(() => {
    if (isSelected && image) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, image]);

  return (
    <>
      <Image
        image={image}
        {...shapeProps}
        ref={shapeRef}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: node.width() * scaleX,
            height: node.height() * scaleY,
          });
        }}
      />
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
};

const CanvasEditor = () => {
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const fileInputRef = useRef();
  const stageRef = useRef();
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState("");

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newImg = {
        id: `img-${elements.length + 1}`,
        type: "image",
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        src: reader.result,
      };
      setElements([...elements, newImg]);
    };
    reader.readAsDataURL(file);
  };

  const triggerImageUpload = () => {
    fileInputRef.current.click();
  };

  const handleDeselect = (e) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  const updateElement = (newAttrs, index) => {
    const updated = elements.slice();
    updated[index] = newAttrs;
    setElements(updated);
  };

  const exportToPDF = async () => {
    const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
    const pdf = new jsPDF("p", "pt", "a4");
    const imgProps = pdf.getImageProperties(dataURL);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(dataURL, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("canvas.pdf");
  };

  const exportToHTML = () => {
    const canvasElements = elements
      .map((el) => {
        if (el.type === "text") {
          return `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; font-size: ${el.fontSize}px; font-style: ${el.fontStyle}; color: ${el.fill};">${el.text}</div>`;
        } else if (el.type === "image") {
          return `<img src="${el.src}" style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;" />`;
        }
        return "";
      })
      .join("");

    const htmlContent = `
    <html>
      <head>
        <style>
          body {
            position: relative;
            width: 794px;
            height: 1123px;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
          }
        </style>
      </head>
      <body>
        ${canvasElements}
      </body>
    </html>
  `;

    navigator.clipboard
      .writeText(htmlContent)
      .then(() => {
        alert("HTML code copied to clipboard!");
      })
      .catch((err) => {
        alert("Failed to copy HTML: " + err);
      });
  };

  return (
    <div>
      <button onClick={() => setShowTextInput(true)}>Add Text</button>
      <button onClick={triggerImageUpload}>Add Image</button>
      <button onClick={exportToPDF}>Export to PDF</button>
      <button onClick={exportToHTML}>Export to HTML</button>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />

      {showTextInput && (
        <div style={{ margin: "10px 0" }}>
          <input
            type="text"
            placeholder="Enter text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          <button
            onClick={() => {
              if (newText.trim()) {
                const newTextElement = {
                  id: `text-${elements.length + 1}`,
                  type: "text",
                  x: 70,
                  y: 80,
                  text: newText,
                  fontSize: 20,
                  draggable: true,
                  fill: "black",
                };
                setElements([...elements, newTextElement]);
                setNewText("");
                setShowTextInput(false);
              }
            }}
          >
            Add to Canvas
          </button>
          <button onClick={() => setShowTextInput(false)}>Cancel</button>
        </div>
      )}

      {selectedId && (
        <div style={{ margin: "10px 0" }}>
          {elements.find((el) => el.id === selectedId)?.type === "text" && (
            <>
              <label>Color: </label>
              <input
                type="color"
                onChange={(e) =>
                  updateElement(
                    {
                      ...elements.find((el) => el.id === selectedId),
                      fill: e.target.value,
                    },
                    elements.findIndex((el) => el.id === selectedId)
                  )
                }
              />
              <label> Style: </label>
              <select
                onChange={(e) =>
                  updateElement(
                    {
                      ...elements.find((el) => el.id === selectedId),
                      fontStyle: e.target.value,
                    },
                    elements.findIndex((el) => el.id === selectedId)
                  )
                }
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="italic">Italic</option>
              </select>
            </>
          )}

          {elements.find((el) => el.id === selectedId)?.type === "image" && (
            <>
              <label> Width: </label>
              <input
                type="number"
                value={
                  elements.find((el) => el.id === selectedId)?.width || 100
                }
                onChange={(e) =>
                  updateElement(
                    {
                      ...elements.find((el) => el.id === selectedId),
                      width: parseInt(e.target.value),
                    },
                    elements.findIndex((el) => el.id === selectedId)
                  )
                }
              />
              <label> Height: </label>
              <input
                type="number"
                value={
                  elements.find((el) => el.id === selectedId)?.height || 100
                }
                onChange={(e) =>
                  updateElement(
                    {
                      ...elements.find((el) => el.id === selectedId),
                      height: parseInt(e.target.value),
                    },
                    elements.findIndex((el) => el.id === selectedId)
                  )
                }
              />
            </>
          )}

          <button
            style={{ marginLeft: "20px", color: "red" }}
            onClick={() => {
              setElements(elements.filter((el) => el.id !== selectedId));
              setSelectedId(null);
            }}
          >
            Delete
          </button>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={794}
        height={1123}
        onMouseDown={handleDeselect}
        onTouchStart={handleDeselect}
        style={{ border: "1px solid #ccc", marginTop: "10px" }}
      >
        <Layer>
          {elements.map((el, i) => {
            const commonProps = {
              key: el.id,
              shapeProps: el,
              isSelected: el.id === selectedId,
              onSelect: () => setSelectedId(el.id),
              onChange: (newAttrs) => updateElement(newAttrs, i),
            };

            if (el.type === "text") return <EditableText {...commonProps} />;
            if (el.type === "image") return <DraggableImage {...commonProps} />;
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default CanvasEditor;
