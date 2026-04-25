import { useEffect } from 'react';
import { Button, Result } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export default function AcceptGithub() {
    const navigate = useNavigate();

    useEffect(() => {
        const hasGithubSession = !!localStorage.getItem('githubAccessToken');
        if (hasGithubSession) {
            const timer = window.setTimeout(() => {
                navigate('/code-builder', { replace: true });
            }, 1200);

            return () => window.clearTimeout(timer);
        }
    }, [navigate]);

    return (
        <Result
            icon={<GithubOutlined />}
            title="GitHub sign-in is handled in-app"
            subTitle="This callback page is kept for compatibility. Please return to Code Builder and use Sign in with GitHub."
            extra={[
                <Button type="primary" key="code-builder" onClick={() => navigate('/code-builder')}>
                    Go to Code Builder
                </Button>,
                <Button key="dashboard" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                </Button>,
            ]}
        />
    );
}
