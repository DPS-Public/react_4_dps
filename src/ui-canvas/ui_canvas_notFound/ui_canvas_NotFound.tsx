import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button, Result } from "antd";

const CanvasUINotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        {/* <h1 className="text-4xl font-bold mb-4">404</h1> */}
        <Result
            status="404"
            title="404"
            subTitle="Sorry, the page you visited does not exist"
            extra={<Button href="/dashboard" type="primary">Back Home</Button>}
        />
       
      </div>
    </div>
  );
};

export default CanvasUINotFound;
