import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { User } from '@/types';
import { useUser } from '@/hooks/useUser';
import { useTranslation } from '@/hooks/useLanguage';
import { PRESET_COLORS } from '@/types';
import { Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface IdentityPortalProps {
  onSelect: (user: User) => void;
}

export const IdentityPortal = ({ onSelect }: IdentityPortalProps) => {
  const { users, addUser, fetchUsers } = useUser();
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 背景动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    let animationId: number;

    const animate = () => {
      time += 0.005;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制流动的渐变网格
      for (let i = 0; i < 5; i++) {
        const gradient = ctx.createRadialGradient(
          canvas.width * (0.3 + Math.sin(time + i) * 0.2),
          canvas.height * (0.3 + Math.cos(time + i * 0.5) * 0.2),
          0,
          canvas.width * 0.5,
          canvas.height * 0.5,
          canvas.width * 0.8
        );

        const colors = ['#7F56D9', '#17B26A', '#F3F4F6'];
        gradient.addColorStop(0, colors[i % 2] + '20');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // GSAP 入场动画
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 标题字符分割动画
      if (titleRef.current) {
        const chars = titleRef.current.querySelectorAll('.char');
        gsap.fromTo(
          chars,
          { y: '100%', opacity: 0 },
          {
            y: '0%',
            opacity: 1,
            duration: 0.8,
            stagger: 0.03,
            ease: 'expo.out',
            delay: 0.2,
          }
        );
      }

      // 卡片 3D 翻转入场
      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.fromTo(
            card,
            { rotateX: 90, opacity: 0, transformOrigin: 'center bottom' },
            {
              rotateX: 0,
              opacity: 1,
              duration: 1,
              ease: 'expo.out',
              delay: 0.4 + index * 0.15,
            }
          );
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // 卡片悬停效果
  const handleCardHover = (index: number, isEnter: boolean) => {
    const card = cardsRef.current[index];
    if (card) {
      gsap.to(card, {
        scale: isEnter ? 1.05 : 1,
        y: isEnter ? -10 : 0,
        boxShadow: isEnter
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };
  // 选择用户
  const handleSelect = (user: User, index: number) => {
    const card = cardsRef.current[index];
    if (card) {
      // 爆发效果
      gsap.to(card, {
        scale: 1.2,
        zIndex: 100,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          onSelect(user);
        },
      });
    } else {
      onSelect(user);
    }
  };

  // 处理新增用户
  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    try {
      const newUser = await addUser(newUserName, selectedColor);
      setIsAddUserOpen(false);
      onSelect(newUser);
    } catch (err) {
      alert(language === 'zh' ? '添加用户失败' : 'Failed to add user');
    }
  };

  // 获取可用颜色
  const availableColors = PRESET_COLORS.filter(
    (color) => !users.some((u) => u.color === color)
  );

  // 分割标题字符
  const renderTitle = (text: string) => {
    return text.split('').map((char, index) => (
      <span key={index} className="char inline-block overflow-hidden">
        <span className="inline-block">{char === ' ' ? '\u00A0' : char}</span>
      </span>
    ));
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {/* 背景画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ zIndex: 0 }}
      />

      {/* 内容 */}
      <div className="relative z-10 text-center px-4">
        {/* 标题 */}
        <h1
          ref={titleRef}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 overflow-hidden"
        >
          {renderTitle(t.selectIdentity)}
        </h1>
        <p className="text-lg md:text-xl text-gray-500 mb-12 opacity-0 animate-fade-in"
           style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
          {t.selectIdentitySub}
        </p>

        {/* 用户卡片 */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          {users.map((user, index) => (
            <div
              key={user.id}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="w-48 h-64 md:w-56 md:h-72 lg:w-64 lg:h-80 rounded-3xl cursor-pointer transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${user.color}15 0%, ${user.color}05 100%)`,
                border: `2px solid ${user.color}30`,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                transformStyle: 'preserve-3d',
              }}
              onMouseEnter={() => handleCardHover(index, true)}
              onMouseLeave={() => handleCardHover(index, false)}
              onClick={() => handleSelect(user, index)}
            >
              <div className="h-full flex flex-col items-center justify-center p-6">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full mb-4 md:mb-6 flex items-center justify-center text-white text-2xl md:text-3xl font-bold transition-transform"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
                  {user.name}
                </h2>
                <div
                  className="w-10 h-1 rounded-full mt-2"
                  style={{ backgroundColor: user.color }}
                />
              </div>
            </div>
          ))}

          {/* 新增用户卡片 */}
          <div
            ref={(el) => { cardsRef.current[users.length] = el; }}
            className="w-48 h-64 md:w-56 md:h-72 lg:w-64 lg:h-80 rounded-3xl cursor-pointer transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 flex flex-col items-center justify-center group"
            onMouseEnter={() => handleCardHover(users.length, true)}
            onMouseLeave={() => handleCardHover(users.length, false)}
            onClick={() => {
              setIsAddUserOpen(true);
              // 预选一个可用颜色
              if (availableColors.length > 0) {
                setSelectedColor(availableColors[0]);
              }
            }}
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:border-purple-400 group-hover:bg-white transition-all">
              <Plus className="w-8 h-8 text-gray-300 group-hover:text-purple-500" />
            </div>
            <span className="mt-4 text-gray-400 font-medium group-hover:text-purple-600">
              {language === 'zh' ? '新增用户' : 'Add User'}
            </span>
          </div>
        </div>

        {/* 新增用户对话框 */}
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent className="max-w-sm rounded-3xl p-6 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-green-500 bg-clip-text text-transparent">
                {language === 'zh' ? '欢迎加入' : 'Join Us'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-name" className="text-gray-600 font-medium ml-1">
                  {language === 'zh' ? '您的名字' : 'Your Name'}
                </Label>
                <Input
                  id="new-user-name"
                  placeholder={language === 'zh' ? '例如: Paul' : 'e.g., Paul'}
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="rounded-2xl border-gray-100 focus:ring-purple-400 focus:border-purple-400 h-12 text-lg"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-gray-600 font-medium ml-1">
                  {language === 'zh' ? '选择主题色' : 'Pick a Theme Color'}
                </Label>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        selectedColor === color ? 'ring-4 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ 
                        backgroundColor: color,
                        '--tw-ring-color': `${color}40`
                      } as any}
                      onClick={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && <Check className="w-5 h-5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button
                onClick={handleAddUser}
                disabled={!newUserName.trim()}
                className="w-full h-12 rounded-2xl text-lg font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: selectedColor }}
              >
                {language === 'zh' ? '开启旅程' : 'Start Journey'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 品牌标识 */}
        <div className="mt-16 opacity-0 animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
          <p className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-green-500 bg-clip-text text-transparent">
            {t.appName}
          </p>
          <p className="text-sm text-gray-400 mt-1">{t.appNameEn}</p>
        </div>
      </div>

      {/* 添加淡入动画样式 */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};
