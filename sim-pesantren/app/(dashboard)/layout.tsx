'use client';

import React from 'react';
import { SidebarProvider } from '@/context/SidebarContext';
import { DashboardLayout } from '@/components/dashboard-layout';

export default function DashboardGroupRoutingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </SidebarProvider>
  );
}
