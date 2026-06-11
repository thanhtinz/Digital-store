// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// components
import CustomBreadcrumbs from '../../components/custom-breadcrumbs';

// ----------------------------------------------------------------------
// Tiêu đề + breadcrumb đồng nhất cho mọi trang quản trị.
// ----------------------------------------------------------------------

type Crumb = { name: string; href?: string };

type Props = {
  title: string;
  links?: Crumb[];          // breadcrumb phụ (sau "Quản trị")
  action?: React.ReactNode; // nút hành động bên phải (vd "Thêm mới")
};

export default function AdminPageHeader({ title, links = [], action }: Props) {
  return (
    <CustomBreadcrumbs
      heading={title}
      links={[{ name: 'Quản trị', href: PATH_DASHBOARD.admin.root }, ...links, { name: title }]}
      action={action}
      sx={{ mb: { xs: 3, md: 4 } }}
    />
  );
}
