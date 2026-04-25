import { Card, Form, Input, Button, Typography, Space } from "antd";
import { Link } from "react-router-dom";
import useCanvasForgetPassStates from "./actions/canvasForgetPassStates";

const { Title, Text } = Typography;

export default function CanvasForgetPass() {
  const {
    email, 
    setEmail,
    handleSubmit,
    loading
  } = useCanvasForgetPassStates();

  const onFinish = () => {
    const syntheticEvent = { preventDefault: () => {} };
    handleSubmit(syntheticEvent);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <Space direction="vertical" size="large" className="w-full">
          {/* Header */}
          <div className="text-center">
            <Title level={2} className="!mb-2">
              Forgot Password
            </Title>
            <Text type="secondary">
              Enter your email to receive a password reset link
            </Text>
          </div>

          {/* Form */}
          <Form onFinish={onFinish} layout="vertical" className="w-full">
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="large"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="w-full h-10" 
                size="large"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Form.Item>
          </Form>

          {/* Success message info */}
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              If the email exists in our system, you will receive reset instructions.
            </Text>
          </div>

          {/* Footer with login link */}
          <div className="flex justify-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Space>
      </Card>
    </div>
  );
}
