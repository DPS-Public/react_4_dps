import {createRoot} from 'react-dom/client'

import './index.css'
import {RouterProvider} from 'react-router-dom';
import {router} from './routes/router.tsx';
import {Provider} from 'react-redux';
import {store} from './store/store.ts';
import {AuthProvider} from '@/auth/AuthContext.tsx';

createRoot(document.getElementById("root")!).render(<>
   <AuthProvider>
      <Provider store={store}>
         <RouterProvider router={router} />
      </Provider>
   </AuthProvider>
</>);
